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

interface GenerateAvatarRequest {
  prompt: string
  reference_image_url?: string // If provided, uses InstantID for identity-preserving generation
  aspect_ratio?: string // '9:16' full body, '3:4' half body, '1:1' headshot
}

// Download generated image and convert to base64
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const base64 = base64Encode(new Uint8Array(arrayBuffer))
  const contentType = response.headers.get('content-type') || 'image/png'
  return `data:${contentType};base64,${base64}`
}

// Synchronous fal.ai call (waits for result)
async function falRun(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const url = `https://fal.run/${endpoint}`

  console.log('Calling fal.run:', endpoint)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Fal request failed: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!FAL_KEY) {
      throw new Error('FAL_KEY not configured')
    }

    const body: GenerateAvatarRequest = await req.json()

    // Credit check (skip for guest users)
    const isGuest = (body as any).guest === true
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    let creditUser: { userId: string; balance: number } | null = null
    if (!isGuest) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      try {
        creditUser = await checkCreditsFromToken(authHeader, supabase, 'model_photo')
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

    if (!body.prompt) {
      throw new Error('No prompt provided')
    }

    console.log('Generating avatar with prompt:', body.prompt.substring(0, 100))

    let imageUrl: string

    if (body.reference_image_url) {
      // PuLID FLUX: identity-preserving generation (same person, different pose)
      // Uses FLUX.1 dev backbone — much higher quality than InstantID (SDXL)
      // PuLID uses image_size enum, not aspect_ratio
      const imageSizeMap: Record<string, string> = {
        '9:16': 'portrait_16_9',
        '3:4': 'portrait_4_3',
        '1:1': 'square_hd',
      }
      const imageSize = imageSizeMap[body.aspect_ratio || '1:1'] || 'square_hd'
      console.log('Using PuLID FLUX with face reference, image_size:', imageSize)
      const pulidResult = await falRun('fal-ai/flux-pulid', {
        prompt: body.prompt,
        reference_image_url: body.reference_image_url,
        image_size: imageSize,
        num_inference_steps: 25,
        guidance_scale: 4,
        id_weight: 0.9,
        true_cfg: 1.5,
        max_sequence_length: '256',
      }) as { images?: Array<{ url: string }> }

      if (!pulidResult.images || pulidResult.images.length === 0) {
        throw new Error('No images in PuLID response')
      }
      imageUrl = pulidResult.images[0].url
    } else {
      // FLUX 2 Pro — sharper, higher quality than FLUX 1.1 Pro Ultra
      // Uses image_size enum instead of aspect_ratio
      const imageSizeMap: Record<string, string> = {
        '9:16': 'portrait_16_9',
        '3:4': 'portrait_4_3',
        '1:1': 'square_hd',
      }
      const imageSize = imageSizeMap[body.aspect_ratio || '1:1'] || 'square_hd'
      console.log('Using FLUX 2 Pro, image_size:', imageSize)
      const fluxResult = await falRun('fal-ai/flux-2-pro', {
        prompt: body.prompt,
        image_size: imageSize,
        safety_tolerance: '2',
        output_format: 'png',
      }) as { images?: Array<{ url: string }> }

      if (!fluxResult.images || fluxResult.images.length === 0) {
        throw new Error('No images in fal response')
      }

      imageUrl = fluxResult.images[0].url
    }
    console.log('Avatar generated, downloading for base64 conversion...')

    const base64Image = await downloadImageAsBase64(imageUrl)
    console.log('Avatar generated successfully')

    // Deduct credits after successful generation (skip for guests)
    if (creditUser && !isGuest) {
      await checkAndDeductCredits(supabase, creditUser.userId, 'model_photo')
    }

    return new Response(JSON.stringify({
      success: true,
      image: base64Image,
      imageUrl: imageUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error.message)

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
