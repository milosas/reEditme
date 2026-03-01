import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const FAL_KEY = Deno.env.get('FAL_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CREDIT_COST = 3 // post_image
const CREDIT_DESCRIPTION = 'Iraso nuotrauka'

async function checkCredits(authHeader: string, cost: number): Promise<{ userId: string; balance: number }> {
  let userId: string
  try {
    const token = authHeader.replace('Bearer ', '')
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    userId = payload.sub
    if (!userId) throw new Error('No user ID in token')
  } catch {
    const err = new Error('Unauthorized') as any
    err.type = 'unauthorized'
    throw err
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  const balance = profile?.credits || 0
  if (balance < cost) {
    const err = new Error('insufficient_credits') as any
    err.type = 'insufficient_credits'
    err.required = cost
    err.balance = balance
    throw err
  }

  return { userId, balance }
}

async function deductCredits(userId: string, cost: number, description: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await supabase.from('profiles').select('credits').eq('id', userId).single()
  const newBalance = Math.max(0, (data?.credits || 0) - cost)
  await supabase.from('profiles').update({ credits: newBalance }).eq('id', userId)
  await supabase.from('credit_transactions').insert({
    user_id: userId, amount: -cost, type: 'usage', description
  })
  console.log(`Deducted ${cost} credits from user ${userId}. New balance: ${newBalance}`)
}

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
        creditUser = await checkCredits(authHeader, CREDIT_COST)
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

    const imagePrompt = `${body.prompt} for ${body.industry} business, professional, high-quality, social media post image, modern aesthetic, clean composition`

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
      await deductCredits(creditUser.userId, CREDIT_COST, CREDIT_DESCRIPTION)
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
