import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const LATE_API_KEY = Deno.env.get('LATE_API_KEY')
const LATE_PROFILE_ID = Deno.env.get('LATE_PROFILE_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublishRequest {
  text: string
  imageUrl?: string
  platforms: { platform: string; accountId: string }[]
}

function classifyLateError(status: number, errorText: string): Response {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  if (status === 401) {
    return new Response(
      JSON.stringify({ success: false, error: 'API autorizacija nepavyko.', code: 'AUTH_FAILED' }),
      { status: 401, headers }
    )
  }
  if (status === 400) {
    return new Response(
      JSON.stringify({ success: false, error: 'Neteisingi skelbimo duomenys: ' + errorText, code: 'BAD_REQUEST' }),
      { status: 400, headers }
    )
  }
  if (status === 403) {
    return new Response(
      JSON.stringify({ success: false, error: 'Skelbimo teisės nepakankamos.', code: 'FORBIDDEN' }),
      { status: 403, headers }
    )
  }
  if (status === 429) {
    return new Response(
      JSON.stringify({ success: false, error: 'Per daug užklausų. Palaukite ir bandykite vėliau.', code: 'RATE_LIMIT' }),
      { status: 429, headers }
    )
  }
  return new Response(
    JSON.stringify({ success: false, error: 'Skelbimo klaida: ' + errorText, code: 'API_ERROR' }),
    { status, headers }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!LATE_API_KEY) {
      throw new Error('LATE_API_KEY not configured')
    }

    if (!LATE_PROFILE_ID) {
      return new Response(
        JSON.stringify({ success: false, error: 'LATE_PROFILE_ID not configured', code: 'INTERNAL_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: PublishRequest = await req.json()

    if (!body.text || !body.platforms?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Privalomi laukai: text ir platforms' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build LATE API request
    const latePayload: Record<string, unknown> = {
      profileId: LATE_PROFILE_ID,
      content: body.text,
      publishNow: true,
      platforms: body.platforms.map(p => ({
        platform: p.platform,
        accountId: p.accountId,
      })),
    }

    // Include media if image URL provided
    if (body.imageUrl) {
      latePayload.media = [{ url: body.imageUrl, type: 'image' }]
    }

    console.log('Publishing to LATE API:', JSON.stringify({ platforms: body.platforms.length, hasImage: !!body.imageUrl }))

    const response = await fetch('https://getlate.dev/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LATE_API_KEY}`,
      },
      body: JSON.stringify(latePayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LATE API error:', response.status, errorText)
      return classifyLateError(response.status, errorText)
    }

    const result = await response.json()
    console.log('LATE API response:', JSON.stringify(result))

    return new Response(
      JSON.stringify({ success: true, results: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Publish social error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Skelbimo klaida. Bandykite dar kartą.', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
