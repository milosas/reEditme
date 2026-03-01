import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'https://reeditme.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  type: 'credits' | 'social_subscription'
  packageId?: '50' | '150' | '500'
}

const CREDIT_PACKAGES: Record<string, { credits: number; priceInCents: number; name: string }> = {
  '50': { credits: 50, priceInCents: 999, name: '50 kreditu' },
  '150': { credits: 150, priceInCents: 2499, name: '150 kreditu' },
  '500': { credits: 500, priceInCents: 7999, name: '500 kreditu' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Decode JWT to get user_id (Supabase passes it in the auth header)
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

    const body: CheckoutRequest = await req.json()
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

    let session: Stripe.Checkout.Session

    if (body.type === 'credits') {
      const pkg = CREDIT_PACKAGES[body.packageId || '']
      if (!pkg) {
        throw new Error('Invalid package ID. Use: 50, 150, or 500')
      }

      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: pkg.name },
            unit_amount: pkg.priceInCents,
          },
          quantity: 1,
        }],
        metadata: {
          user_id: userId,
          type: 'credits',
          credits_amount: String(pkg.credits),
        },
        success_url: `${SITE_URL}/dashboard?payment=success`,
        cancel_url: `${SITE_URL}/dashboard?payment=cancelled`,
      })

    } else if (body.type === 'social_subscription') {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Socialiniu tinklu prenumerata' },
            unit_amount: 1000, // €10.00
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        metadata: {
          user_id: userId,
          type: 'social_subscription',
        },
        success_url: `${SITE_URL}/dashboard?payment=success`,
        cancel_url: `${SITE_URL}/dashboard?payment=cancelled`,
      })

    } else {
      throw new Error('Invalid type. Use: credits or social_subscription')
    }

    console.log(`Checkout session created: ${session.id} for user ${userId}`)

    return new Response(JSON.stringify({
      success: true,
      url: session.url,
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
