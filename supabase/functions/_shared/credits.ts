import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Credit action types matching all edge function operations
export type CreditAction = 'model_photo' | 'tryon_photo' | 'post_image' | 'post_text' | 'text_from_image' | 'post_process'

// Centralized credit costs — single source of truth for all edge functions
export const CREDIT_COSTS: Record<CreditAction, { cost: number; description: string }> = {
  model_photo: { cost: 4, description: 'Modelio nuotrauka' },
  tryon_photo: { cost: 3, description: 'Try-on nuotrauka' },
  post_image: { cost: 3, description: 'Iraso nuotrauka' },
  post_text: { cost: 1, description: 'Iraso tekstas' },
  text_from_image: { cost: 1, description: 'Tekstas is nuotraukos' },
  post_process: { cost: 1, description: 'Post-apdorojimas' },
}

/**
 * Atomically check and deduct credits using Postgres RPC with row locking.
 * Replaces the old read-then-write pattern that allowed race conditions.
 */
export async function checkAndDeductCredits(
  supabase: SupabaseClient,
  userId: string,
  action: CreditAction
): Promise<{ success: boolean; newBalance: number }> {
  const { cost, description } = CREDIT_COSTS[action]

  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: cost,
    p_description: description,
  })

  if (error) {
    console.error('deduct_credits RPC error:', error)
    throw new Error(`Credit deduction failed: ${error.message}`)
  }

  // RPC returns array of { success, new_balance }
  const result = Array.isArray(data) ? data[0] : data
  return {
    success: result?.success ?? false,
    newBalance: result?.new_balance ?? 0,
  }
}

/**
 * Atomically add credits using Postgres RPC with row locking.
 * Used by stripe-webhook and bonus flows.
 */
export async function addCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  description: string,
  type: string = 'purchase',
  stripeSessionId: string | null = null
): Promise<{ success: boolean; newBalance: number }> {
  const { data, error } = await supabase.rpc('increment_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
    p_type: type,
    p_stripe_session_id: stripeSessionId,
  })

  if (error) {
    console.error('increment_credits RPC error:', error)
    throw new Error(`Credit addition failed: ${error.message}`)
  }

  const result = Array.isArray(data) ? data[0] : data
  return {
    success: result?.success ?? false,
    newBalance: result?.new_balance ?? 0,
  }
}

/**
 * Check credits from JWT auth header without deducting.
 * Extracts userId from token, queries balance, throws typed errors.
 * Same base64url decode pattern used across all existing edge functions.
 */
export async function checkCreditsFromToken(
  authHeader: string,
  supabase: SupabaseClient,
  action: CreditAction
): Promise<{ userId: string; balance: number; hasCredits: boolean; required: number }> {
  // Extract userId from JWT
  let userId: string
  try {
    const token = authHeader.replace('Bearer ', '')
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    userId = payload.sub
    if (!userId) throw new Error('No user ID in token')
  } catch {
    const err = new Error('Unauthorized') as Error & { type: string }
    err.type = 'unauthorized'
    throw err
  }

  // Query current balance
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    const err = new Error('Unauthorized') as Error & { type: string }
    err.type = 'unauthorized'
    throw err
  }

  const balance = profile.credits || 0
  const required = CREDIT_COSTS[action].cost
  const hasCredits = balance >= required

  if (!hasCredits) {
    const err = new Error('insufficient_credits') as Error & { type: string; required: number; balance: number }
    err.type = 'insufficient_credits'
    err.required = required
    err.balance = balance
    throw err
  }

  return { userId, balance, hasCredits, required }
}
