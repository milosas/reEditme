import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { CREDIT_COSTS, type CreditAction } from '../_shared/credits.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckCreditsRequest {
  action: CreditAction
  deduct?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase env vars')
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let userId: string
    try {
      const token = authHeader.replace('Bearer ', '')
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(base64))
      userId = payload.sub
      if (!userId) throw new Error('No user ID in token')
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body: CheckCreditsRequest = await req.json()
    const actionInfo = CREDIT_COSTS[body.action]
    if (!actionInfo) {
      throw new Error(`Invalid action: ${body.action}`)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get current balance
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) {
      throw new Error('Could not fetch user profile')
    }

    const balance = profile.credits || 0
    const required = actionInfo.cost
    const hasCredits = balance >= required

    // If deduct mode and has enough credits
    if (body.deduct && hasCredits) {
      const newBalance = balance - required

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', userId)

      if (updateError) {
        throw new Error('Failed to deduct credits')
      }

      // Log the usage transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -required,
        type: 'usage',
        description: actionInfo.description,
      })

      console.log(`Deducted ${required} credits from user ${userId}. New balance: ${newBalance}`)

      return new Response(JSON.stringify({
        success: true,
        hasCredits: true,
        required,
        balance: newBalance,
        deducted: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check-only mode
    return new Response(JSON.stringify({
      success: true,
      hasCredits,
      required,
      balance,
      deducted: false,
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
