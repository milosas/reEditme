import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { addCredits } from '../_shared/credits.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify webhook signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('Missing stripe-signature header')
    }

    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    console.log(`Webhook event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const type = session.metadata?.type

        if (!userId) {
          console.error('No user_id in session metadata')
          break
        }

        if (type === 'credits') {
          const creditsAmount = parseInt(session.metadata?.credits_amount || '0')
          if (creditsAmount <= 0) {
            console.error('Invalid credits_amount in metadata')
            break
          }

          // Idempotency check: skip if this session was already processed
          const { data: existing } = await supabase
            .from('credit_transactions')
            .select('id')
            .eq('stripe_session_id', session.id)
            .maybeSingle()

          if (existing) {
            console.log(`Session ${session.id} already processed, skipping`)
            break
          }

          // Add credits atomically (handles both increment and transaction logging)
          await addCredits(supabase, userId, creditsAmount, `Nusipirkta ${creditsAmount} kreditu`, 'purchase', session.id)

          // Save stripe customer ID if present
          if (session.customer) {
            await supabase
              .from('profiles')
              .update({ stripe_customer_id: session.customer as string })
              .eq('id', userId)
          }

          console.log(`Added ${creditsAmount} credits to user ${userId}`)

        } else if (type === 'social_subscription') {
          await supabase
            .from('profiles')
            .update({
              social_subscription_active: true,
              stripe_customer_id: session.customer as string,
            })
            .eq('id', userId)

          console.log(`Activated social subscription for user ${userId}`)
        }
        break
      }

      case 'invoice.paid': {
        // Renew social subscription on recurring payment
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        if (customerId) {
          await supabase
            .from('profiles')
            .update({ social_subscription_active: true })
            .eq('stripe_customer_id', customerId)

          console.log(`Renewed social subscription for customer ${customerId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        // Deactivate social subscription on cancellation
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        if (customerId) {
          await supabase
            .from('profiles')
            .update({ social_subscription_active: false })
            .eq('stripe_customer_id', customerId)

          console.log(`Deactivated social subscription for customer ${customerId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
