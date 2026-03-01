import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CREDIT_COST = 1 // text_from_image
const CREDIT_DESCRIPTION = 'Tekstas is nuotraukos'

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

interface GenerateRequest {
  imageUrl: string
  tone?: 'professional' | 'friendly' | 'motivating' | 'humorous'
  emoji?: 'yes' | 'no' | 'minimal'
  length?: 'short' | 'medium' | 'long'
}

function buildSystemPrompt(): string {
  return `Tu esi socialinių tinklų turinio ekspertas Lietuvoje.
Tavo užduotis — pagal pateiktą nuotrauką sukurti patrauklų socialinio tinklo įrašo tekstą lietuvių kalba.

TAISYKLĖS:
- Analizuok nuotrauką: kas joje vaizduojama, kokia nuotaika, spalvos, kontekstas
- Rašyk natūraliu lietuvišku tonu, tinkamu socialiniams tinklams
- Tekstas turi būti patrauklus ir skatinti engagement
- VISADA įtrauk raginimą veikti (CTA) pabaigoje
- Pritaikyk tekstą pasirinktam tonui, emoji naudojimui ir ilgiui
- Nerašyk hashtag'ų, nebent jie labai tinkami`
}

function buildUserPrompt(request: GenerateRequest): string {
  const toneMap: Record<string, string> = {
    professional: 'profesionalus',
    friendly: 'draugiškas',
    motivating: 'motyvuojantis',
    humorous: 'humoristinis'
  }

  const emojiMap: Record<string, string> = {
    yes: 'Naudok emoji',
    no: 'Nenaudok emoji',
    minimal: 'Naudok minimaliai emoji (1-2)'
  }

  const lengthMap: Record<string, string> = {
    short: 'Trumpas (2-3 sakiniai)',
    medium: 'Vidutinis (4-6 sakiniai)',
    long: 'Ilgas (7-10 sakiniai)'
  }

  return `Pagal šią nuotrauką sukurk socialinio tinklo įrašo tekstą.

Tonas: ${toneMap[request.tone || 'friendly']}
Emoji: ${emojiMap[request.emoji || 'minimal']}
Ilgis: ${lengthMap[request.length || 'medium']}

Rašyk TIK įrašo tekstą, be jokių paaiškinimų ar komentarų.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Parse and validate body BEFORE credit deduction
    const body: GenerateRequest = await req.json()

    if (!body.imageUrl) {
      return new Response(
        JSON.stringify({ error: 'validation_error', message: 'Privalomas laukas: imageUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Credit check and deduct BEFORE streaming (skip for guest users)
    const isGuest = (body as any).guest === true
    if (!isGuest) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'auth_error', message: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let creditUser: { userId: string; balance: number }
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

      // Deduct before streaming since we can't check stream success after
      await deductCredits(creditUser.userId, CREDIT_COST, CREDIT_DESCRIPTION)
    }

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(body)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: body.imageUrl, detail: 'low' } },
            ],
          },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Generate text from image error:', error.message)
    return new Response(
      JSON.stringify({ error: 'internal_error', message: 'Teksto generavimas nepavyko. Bandykite dar kartą.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
