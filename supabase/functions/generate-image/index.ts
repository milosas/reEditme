import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { checkCreditsFromToken, checkAndDeductCredits } from '../_shared/credits.ts'

const FAL_KEY = Deno.env.get('FAL_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateRequest {
  mode: 'tryon' | 'background' | 'relight' | 'edit'
  guest?: boolean
  // tryon fields:
  qualityMode: 'performance' | 'balanced' | 'quality'
  imageCount: number
  images: string[]           // base64 clothing
  avatarImageUrl?: string
  avatarImageBase64?: string
  avatarIsCustom?: boolean
  category?: 'tops' | 'bottoms' | 'one-pieces' | 'auto'
  garmentPhotoType?: 'auto' | 'model' | 'flat-lay'
  garmentLabels?: string[]   // optional label per garment: 'top' | 'bottom' | 'dress' | 'shoes' | 'bag' | 'accessory'
  // post-processing fields:
  sourceImageUrl?: string    // try-on result to post-process
  backgroundPrompt?: string  // for background mode
  lightingStyle?: string     // for relight mode
  editPrompt?: string        // for edit mode
}

interface GeneratedImage {
  url: string
  base64?: string
}

interface GenerateResponse {
  success: boolean
  images?: GeneratedImage[]
  message?: string
  error?: string
}

// Map garmentLabel → FASHN category
function toFashnCategory(label?: string): 'tops' | 'bottoms' | 'one-pieces' | 'auto' {
  if (label === 'top') return 'tops'
  if (label === 'bottom') return 'bottoms'
  if (label === 'dress') return 'one-pieces'
  return 'auto'
}

// Upload base64 image data to fal.ai storage, returns URL
async function uploadToFalStorage(base64Data: string): Promise<string> {
  // Strip data URL prefix if present
  let rawBase64 = base64Data
  if (rawBase64.includes(',')) {
    rawBase64 = rawBase64.split(',')[1]
  }

  // Decode base64 to binary
  const binaryStr = atob(rawBase64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }

  // Determine content type from data URL prefix
  let contentType = 'image/jpeg'
  if (base64Data.startsWith('data:image/png')) {
    contentType = 'image/png'
  } else if (base64Data.startsWith('data:image/webp')) {
    contentType = 'image/webp'
  }

  const fileName = `upload-${Date.now()}.${contentType === 'image/png' ? 'png' : 'jpg'}`
  console.log(`Uploading to fal CDN: ${bytes.length} bytes, type: ${contentType}`)

  // Step 1: Initiate upload via fal CDN v3
  const initResponse = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_name: fileName,
      content_type: contentType,
    }),
  })

  if (!initResponse.ok) {
    const initError = await initResponse.text()
    console.error('Fal CDN initiate failed:', initResponse.status, initError)
    throw new Error(`Fal CDN initiate failed: ${initResponse.status} - ${initError}`)
  }

  const { upload_url, file_url } = await initResponse.json()
  console.log('Got upload URL, uploading...')

  // Step 2: PUT file data to presigned URL
  const putResponse = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: bytes,
  })

  if (!putResponse.ok) {
    const putError = await putResponse.text()
    console.error('Fal CDN PUT failed:', putResponse.status, putError)
    throw new Error(`Fal CDN PUT failed: ${putResponse.status}`)
  }

  console.log('Upload succeeded:', file_url)
  return file_url
}

// Fetch and convert URL image to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const base64 = base64Encode(new Uint8Array(arrayBuffer))
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  return `data:${contentType};base64,${base64}`
}

// Download generated image and convert to base64 for CORS-free frontend handling
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  console.log('Downloading image for base64 conversion:', imageUrl.substring(0, 50) + '...')
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const base64 = base64Encode(new Uint8Array(arrayBuffer))
  const contentType = response.headers.get('content-type') || 'image/png'
  console.log('Image downloaded, size:', arrayBuffer.byteLength, 'bytes')
  return `data:${contentType};base64,${base64}`
}

// Generic fal.ai queue submit + poll utility
async function falQueueSubmitAndPoll(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const queueUrl = `https://queue.fal.run/${endpoint}`

  // Submit to queue
  console.log('Submitting to fal queue:', endpoint)
  const submitResponse = await fetch(queueUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text()
    console.error(`Fal queue submit failed for ${endpoint}:`, {
      status: submitResponse.status,
      statusText: submitResponse.statusText,
      error: errorText,
    })
    throw new Error(`Fal queue submit failed: ${submitResponse.status} - ${errorText}`)
  }

  const submitData = await submitResponse.json()
  const requestId = submitData.request_id
  if (!requestId) {
    throw new Error('No request_id in fal queue response')
  }
  console.log('Fal request submitted:', requestId)

  // Use URLs from submit response when available (avoids nested-path construction bugs)
  const statusUrl = submitData.status_url || `${queueUrl}/requests/${requestId}/status`
  const resultUrl = submitData.response_url || `${queueUrl}/requests/${requestId}`
  console.log('Status URL:', statusUrl)
  const maxPolls = 40 // up to ~2 minutes
  const pollInterval = 3000

  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval))

    const statusResponse = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    })

    if (!statusResponse.ok) {
      console.error('Fal status poll failed:', statusResponse.status)
      continue
    }

    const statusData = await statusResponse.json()
    console.log('Fal status:', statusData.status, `(poll ${i + 1}/${maxPolls})`)

    if (statusData.status === 'COMPLETED') {
      // Result may be embedded in status response (fal.ai includes output on COMPLETED)
      if (statusData.output) {
        console.log('Result embedded in status response')
        return statusData.output
      }
      // Fallback: fetch from result URL
      const resultResponse = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      })
      if (!resultResponse.ok) {
        const errText = await resultResponse.text()
        console.error('Result fetch failed:', resultResponse.status, errText)
        throw new Error(`Fal result fetch failed: ${resultResponse.status}`)
      }
      return await resultResponse.json()
    }

    if (statusData.status === 'FAILED') {
      console.error('Fal generation FAILED:', JSON.stringify(statusData))
      throw new Error(statusData.error || 'Fal generation failed')
    }
  }

  throw new Error('Fal generation timed out')
}

// Handle try-on via FASHN AI (sequential for multi-garment)
async function handleTryOn(body: GenerateRequest): Promise<GenerateResponse> {
  if (!body.images || body.images.length === 0) {
    throw new Error('No clothing images provided')
  }

  // 1. Upload avatar image
  let currentModelUrl: string
  if (body.avatarImageBase64) {
    console.log('Uploading custom avatar to fal storage...')
    try {
      currentModelUrl = await uploadToFalStorage(body.avatarImageBase64)
      console.log('Custom avatar uploaded:', currentModelUrl)
    } catch (avatarError) {
      console.error('Failed to upload custom avatar:', avatarError.message)
      throw new Error('AVATAR_UPLOAD_FAILED: Could not process custom avatar image')
    }
  } else if (body.avatarImageUrl) {
    currentModelUrl = await ensureFalStorageUrl(body.avatarImageUrl)
  } else {
    throw new Error('No avatar image provided')
  }

  // 2. Upload all garment images in parallel
  console.log(`Uploading ${body.images.length} garment image(s) to fal storage...`)
  const garmentUrls = await Promise.all(
    body.images.map((img, i) => {
      console.log(`Uploading garment ${i + 1}/${body.images.length}...`)
      return uploadToFalStorage(img)
    })
  )
  console.log('All garment images uploaded:', garmentUrls)

  // 3. Sequential FASHN try-on — sync call (avoids queue nested-path URL issues)
  // num_samples only makes sense for the last garment (previous steps feed into next)
  const numSamples = (body.imageCount && body.imageCount > 1 && garmentUrls.length === 1) ? Math.min(body.imageCount, 4) : 1

  for (let i = 0; i < garmentUrls.length; i++) {
    const category = toFashnCategory(body.garmentLabels?.[i])
    const isLastStep = i === garmentUrls.length - 1
    console.log(`FASHN try-on step ${i + 1}/${garmentUrls.length}: category=${category}, model=${currentModelUrl.substring(0, 60)}`)

    const fashnResponse = await fetch('https://fal.run/fal-ai/fashn/tryon/v1.6', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_image: currentModelUrl,
        garment_image: garmentUrls[i],
        category,
        garment_photo_type: body.garmentPhotoType || 'auto',
        mode: body.qualityMode || 'balanced',
        output_format: 'jpeg',
        ...(isLastStep && numSamples > 1 ? { num_samples: numSamples } : {}),
      }),
    })

    if (!fashnResponse.ok) {
      const errText = await fashnResponse.text()
      console.error(`FASHN step ${i + 1} failed:`, fashnResponse.status, errText)
      throw new Error(`FASHN try-on failed: ${fashnResponse.status} - ${errText.substring(0, 200)}`)
    }

    const result = await fashnResponse.json() as { image?: { url: string }; images?: Array<{ url: string }> }
    console.log(`Step ${i + 1} result keys:`, Object.keys(result))

    // On last step with num_samples > 1, return all images
    if (isLastStep && numSamples > 1 && result.images && result.images.length > 1) {
      console.log(`Last step returned ${result.images.length} variants`)
      const allImages: GeneratedImage[] = await Promise.all(
        result.images.map(async (img: { url: string }) => {
          const base64 = await downloadImageAsBase64(img.url)
          return { url: img.url, base64 }
        })
      )
      return {
        success: true,
        images: allImages,
        message: 'Try-on generated!',
      }
    }

    const resultImageUrl = result.image?.url || result.images?.[0]?.url
    if (!resultImageUrl) {
      throw new Error(`FASHN returned no image for garment ${i + 1}: ${JSON.stringify(result).substring(0, 200)}`)
    }

    currentModelUrl = resultImageUrl
    console.log(`Step ${i + 1} done:`, currentModelUrl.substring(0, 60))
  }

  // 4. Download final result as base64
  const finalBase64 = await downloadImageAsBase64(currentModelUrl)

  return {
    success: true,
    images: [{ url: currentModelUrl, base64: finalBase64 }],
    message: 'Try-on generated!',
  }
}

// Upload source image URL to fal storage (needed for post-processing — some fal.ai models only accept fal storage URLs)
async function ensureFalStorageUrl(imageUrl: string): Promise<string> {
  // If already a fal storage/CDN URL, use as-is
  if (imageUrl.includes('fal.media') || imageUrl.includes('fal-cdn') || imageUrl.includes('fal.run')) {
    return imageUrl
  }
  console.log('Uploading source image to fal storage...')
  const base64 = await fetchImageAsBase64(imageUrl)
  const falUrl = await uploadToFalStorage(base64)
  console.log('Source image uploaded to fal storage:', falUrl)
  return falUrl
}

// Handle background replacement via Bria
async function handleBackgroundReplace(body: GenerateRequest): Promise<GenerateResponse> {
  if (!body.sourceImageUrl) {
    throw new Error('No source image URL provided')
  }
  if (!body.backgroundPrompt) {
    throw new Error('No background prompt provided')
  }

  console.log('Background replace:', body.backgroundPrompt)
  const sourceUrl = await ensureFalStorageUrl(body.sourceImageUrl)

  const result = await falQueueSubmitAndPoll('fal-ai/bria/background/replace', {
    image_url: sourceUrl,
    prompt: body.backgroundPrompt,
    fast: true,
    refine_prompt: true,
  }) as { images?: Array<{ url: string }> }

  if (!result.images || result.images.length === 0) {
    throw new Error('No images returned from background replace')
  }

  const images: GeneratedImage[] = await Promise.all(
    result.images.map(async (img: { url: string }) => {
      try {
        const base64 = await downloadImageAsBase64(img.url)
        return { url: img.url, base64 }
      } catch {
        return { url: img.url }
      }
    })
  )

  return {
    success: true,
    images,
    message: 'Background replaced!',
  }
}

// Handle relighting via Image Apps V2
async function handleRelight(body: GenerateRequest): Promise<GenerateResponse> {
  if (!body.sourceImageUrl) {
    throw new Error('No source image URL provided')
  }
  if (!body.lightingStyle) {
    throw new Error('No lighting style provided')
  }

  console.log('Relighting:', body.lightingStyle)
  const sourceUrl = await ensureFalStorageUrl(body.sourceImageUrl)

  const result = await falQueueSubmitAndPoll('fal-ai/image-apps-v2/relighting', {
    image_url: sourceUrl,
    lighting_style: body.lightingStyle,
  }) as { images?: Array<{ url: string }> }

  if (!result.images || result.images.length === 0) {
    throw new Error('No images returned from relighting')
  }

  const images: GeneratedImage[] = await Promise.all(
    result.images.map(async (img: { url: string }) => {
      try {
        const base64 = await downloadImageAsBase64(img.url)
        return { url: img.url, base64 }
      } catch {
        return { url: img.url }
      }
    })
  )

  return {
    success: true,
    images,
    message: 'Relighting applied!',
  }
}

// Handle Kontext edit via FLUX Kontext Pro
async function handleKontextEdit(body: GenerateRequest): Promise<GenerateResponse> {
  if (!body.sourceImageUrl) {
    throw new Error('No source image URL provided')
  }
  if (!body.editPrompt) {
    throw new Error('No edit prompt provided')
  }

  console.log('Kontext edit:', body.editPrompt)
  const sourceUrl = await ensureFalStorageUrl(body.sourceImageUrl)

  const result = await falQueueSubmitAndPoll('fal-ai/flux-pro/kontext', {
    image_url: sourceUrl,
    prompt: body.editPrompt,
  }) as { images?: Array<{ url: string }> }

  if (!result.images || result.images.length === 0) {
    throw new Error('No images returned from Kontext edit')
  }

  const images: GeneratedImage[] = await Promise.all(
    result.images.map(async (img: { url: string }) => {
      try {
        const base64 = await downloadImageAsBase64(img.url)
        return { url: img.url, base64 }
      } catch {
        return { url: img.url }
      }
    })
  )

  return {
    success: true,
    images,
    message: 'Edit applied!',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: GenerateRequest | undefined

  try {
    if (!FAL_KEY) {
      throw new Error('FAL_KEY not configured')
    }

    try {
      body = await req.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message)
      return new Response(JSON.stringify({
        success: false,
        images: [],
        message: 'Invalid JSON in request body',
        error: 'PARSE_ERROR',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const mode = body!.mode || 'tryon'
    console.log(`Processing request: mode=${mode}`)

    // Credit check for all modes (skip for guest users)
    const isGuest = body!.guest === true
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    let creditUser: { userId: string; balance: number } | null = null
    const creditAction = mode === 'tryon' ? 'tryon_photo' : 'post_process'
    if (!isGuest) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false, images: [],
          error: 'Missing authorization header',
          message: 'Missing authorization header',
        }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      try {
        creditUser = await checkCreditsFromToken(authHeader, supabase, creditAction)
      } catch (creditErr: any) {
        if (creditErr.type === 'unauthorized') {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        if (creditErr.type === 'insufficient_credits') {
          return new Response(JSON.stringify({
            error: 'insufficient_credits',
            message: 'Nepakanka kreditų',
            required: creditErr.required,
            balance: creditErr.balance,
          }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        throw creditErr
      }
    }

    let response: GenerateResponse

    switch (mode) {
      case 'tryon':
        response = await handleTryOn(body!)
        break
      case 'background':
        response = await handleBackgroundReplace(body!)
        break
      case 'relight':
        response = await handleRelight(body!)
        break
      case 'edit':
        response = await handleKontextEdit(body!)
        break
      default:
        throw new Error(`Unknown mode: ${mode}`)
    }

    // Deduct credits after successful generation (skip for guests)
    if (creditUser && response.success && !isGuest) {
      await checkAndDeductCredits(supabase, creditUser.userId, creditAction)
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const mode = body?.mode || 'unknown'
    const msg = (error.message || '').toLowerCase()
    console.error(`Error in mode=${mode}:`, error.message)

    let status = 400
    let errorCode = `[${mode}] ${error.message}`

    if (/rate.?limit|429|too many/i.test(msg)) {
      status = 429
      errorCode = 'RATE_LIMIT'
    } else if (/timeout|timed?\s*out|deadline/i.test(msg)) {
      status = 408
      errorCode = 'TIMEOUT'
    } else if (/invalid.?image|image.?validation|nsfw|could not process/i.test(msg)) {
      status = 422
      errorCode = 'BAD_IMAGE'
    }

    const response: GenerateResponse = {
      success: false,
      images: [],
      message: error.message || 'Generation failed',
      error: errorCode,
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
