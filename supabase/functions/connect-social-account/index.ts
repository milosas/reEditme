import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const LATE_API_KEY = Deno.env.get('LATE_API_KEY')
const LATE_PROFILE_ID = Deno.env.get('LATE_PROFILE_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConnectRequest {
  action: 'get-auth-url' | 'list-accounts'
  platform?: string
  redirectUrl?: string
}

function classifyLateError(status: number, errorText: string): Response {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  if (status === 401) {
    return new Response(
      JSON.stringify({ success: false, error: 'API autorizacija nepavyko. Patikrinkite API raktą.', code: 'AUTH_FAILED' }),
      { status: 401, headers }
    )
  }
  if (status === 400) {
    return new Response(
      JSON.stringify({ success: false, error: 'Neteisingi duomenys: ' + errorText, code: 'BAD_REQUEST' }),
      { status: 400, headers }
    )
  }
  if (status === 403) {
    return new Response(
      JSON.stringify({ success: false, error: 'Prieiga uždrausta. Patikrinkite paskyros teises.', code: 'FORBIDDEN' }),
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
    JSON.stringify({ success: false, error: 'LATE API klaida: ' + errorText, code: 'API_ERROR' }),
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

    const body: ConnectRequest = await req.json()

    if (!body.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Privalomas laukas: action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'get-auth-url') {
      if (!body.platform) {
        return new Response(
          JSON.stringify({ success: false, error: 'Privalomas laukas: platform' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const redirectUrl = body.redirectUrl || 'https://reeditme.com/oauth-callback'

      console.log('Getting auth URL for platform:', body.platform)

      const connectUrl = `https://getlate.dev/api/v1/connect/${body.platform}?profileId=${LATE_PROFILE_ID}&redirectUrl=${encodeURIComponent(redirectUrl)}`

      const response = await fetch(connectUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LATE_API_KEY}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LATE API connect error:', response.status, errorText)
        return classifyLateError(response.status, errorText)
      }

      const result = await response.json()

      return new Response(
        JSON.stringify({ success: true, authUrl: result.authUrl || result.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'list-accounts') {
      console.log('Listing connected accounts')

      const response = await fetch('https://getlate.dev/api/v1/accounts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LATE_API_KEY}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LATE API accounts error:', response.status, errorText)
        return classifyLateError(response.status, errorText)
      }

      const result = await response.json()

      return new Response(
        JSON.stringify({ success: true, accounts: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Nežinomas action tipas' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Connect social account error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Prisijungimo klaida. Bandykite dar kartą.', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
