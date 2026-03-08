import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { checkCreditsFromToken, checkAndDeductCredits } from '../_shared/credits.ts'

const FAL_KEY = Deno.env.get('FAL_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!FAL_KEY) {
      throw new Error('FAL_KEY not configured')
    }

    const body: { industry: string; prompt: string; guest?: boolean } = await req.json()

    // Credit check (skip for guest users)
    const isGuest = body.guest === true
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    let creditUser: { userId: string; balance: number } | null = null
    if (!isGuest) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'auth_error', message: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        creditUser = await checkCreditsFromToken(authHeader, supabase, 'post_image')
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

    if (!body.industry || !body.prompt) {
      return new Response(
        JSON.stringify({ error: 'validation_error', message: 'Privalomi laukai: industry ir prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const industryStyles: Record<string, { color: string; lighting: string; material: string }> = {
      'e-komerc':     { color: 'clean vibrant product colors', lighting: 'bright even studio', material: 'smooth packaging and fabric' },
      'grožio':       { color: 'soft pastel palette', lighting: 'diffused golden', material: 'dewy skin texture' },
      'trener':       { color: 'high contrast dark tones', lighting: 'dramatic rim light', material: 'sweat and steel' },
      'kineziterapeut': { color: 'calm blue-green tones', lighting: 'soft natural', material: 'medical and wellness' },
      'odontolog':    { color: 'clean white and blue tones', lighting: 'bright clinical', material: 'glossy dental surfaces' },
      'veterinar':    { color: 'warm friendly tones', lighting: 'soft natural', material: 'fur and paw textures' },
      'psicholog':    { color: 'muted calming pastels', lighting: 'soft ambient', material: 'cozy interior textures' },
      'nekilnojam':   { color: 'warm inviting neutrals', lighting: 'golden hour', material: 'wood and stone' },
      'fotograf':     { color: 'muted film tones', lighting: 'natural side-lit', material: 'matte print texture' },
      'buhalter':     { color: 'professional navy and white', lighting: 'clean office', material: 'paper and glass' },
      'teisinink':    { color: 'dark formal tones', lighting: 'warm ambient', material: 'leather and wood' },
      'auto':         { color: 'deep metallic tones', lighting: 'dramatic spot light', material: 'glossy paint and chrome' },
      'restoran':     { color: 'warm appetizing tones', lighting: 'overhead natural', material: 'glossy ceramic and wood' },
      'kavin':        { color: 'warm brown and cream', lighting: 'cozy ambient', material: 'ceramic cups and pastry' },
      'statyb':       { color: 'industrial earth tones', lighting: 'bright daylight', material: 'concrete and steel' },
      'santech':      { color: 'clean blue and silver', lighting: 'bright functional', material: 'pipes and metal fittings' },
      'elektrik':     { color: 'safety yellow and grey', lighting: 'focused work light', material: 'cables and circuit boards' },
      'programuot':   { color: 'dark mode blue-purple', lighting: 'screen glow ambient', material: 'sleek tech surfaces' },
      'dizainer':     { color: 'creative vibrant accents', lighting: 'bright studio', material: 'textured art surfaces' },
      'konditer':     { color: 'sweet pastel palette', lighting: 'soft overhead natural', material: 'frosting and sprinkles' },
      'korepetitor':  { color: 'warm friendly tones', lighting: 'bright classroom', material: 'books and stationery' },
      'valym':        { color: 'fresh green and white', lighting: 'bright clean', material: 'sparkling surfaces' },
    }

    // Match industry to style by keyword prefix
    const industryLower = (body.industry || '').toLowerCase()
    let style = { color: 'natural balanced tones', lighting: 'soft studio', material: 'clean surfaces' }
    for (const [key, s] of Object.entries(industryStyles)) {
      if (industryLower.includes(key)) {
        style = s
        break
      }
    }

    // JSON-structured prompt: subject first, colorRestriction last (strongest weight in FLUX)
    const imagePrompt = `${body.prompt}, ${style.lighting} lighting, ${style.material}, clean composition, professional social media post, ${style.color} — no clashing or oversaturated tones`

    console.log('Generating post image with FLUX 2 Pro:', imagePrompt.substring(0, 100))

    const response = await fetch('https://fal.run/fal-ai/flux-2-pro', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: 'square_hd',
        output_format: 'png',
        safety_tolerance: '2',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Fal request failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json() as { images?: Array<{ url: string }> }

    if (!result.images || result.images.length === 0) {
      throw new Error('No images in fal response')
    }

    const imageUrl = result.images[0].url
    console.log('Post image generated:', imageUrl.substring(0, 50))

    // Deduct credits after successful generation (skip for guests)
    if (creditUser && !isGuest) {
      await checkAndDeductCredits(supabase, creditUser.userId, 'post_image')
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generate post image error:', error.message)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('timed out')) {
      return new Response(
        JSON.stringify({ error: 'timeout', message: 'Paveikslėlio generavimas užtruko per ilgai. Bandykite dar kartą.' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'internal_error', message: 'Generavimo klaida. Bandykite dar kartą.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
