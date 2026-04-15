import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_IDS = {
  pro: Deno.env.get('STRIPE_PRICE_PRO') || 'price_pro_placeholder',
  premium: Deno.env.get('STRIPE_PRICE_PREMIUM') || 'price_premium_placeholder',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan, success_url, cancel_url } = await req.json();

  if (!PRICE_IDS[plan]) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: success_url || `${req.headers.get('origin')}/settings?plan_success=1`,
    cancel_url: cancel_url || `${req.headers.get('origin')}/settings`,
    metadata: { user_email: user.email, plan },
  });

  return Response.json({ url: session.url });
});