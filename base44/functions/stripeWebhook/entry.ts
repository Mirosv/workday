import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return Response.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userEmail = session.metadata?.user_email;
    const plan = session.metadata?.plan;

    if (userEmail && plan) {
      const list = await base44.asServiceRole.entities.BusinessSettings.filter({ created_by: userEmail });
      if (list && list.length > 0) {
        const expires = new Date();
        expires.setMonth(expires.getMonth() + 1);
        await base44.asServiceRole.entities.BusinessSettings.update(list[0].id, {
          plan,
          status: 'active',
          plan_expires_at: expires.toISOString().split('T')[0],
        });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const customer = await stripe.customers.retrieve(sub.customer);
    const userEmail = customer.email;
    if (userEmail) {
      const list = await base44.asServiceRole.entities.BusinessSettings.filter({ created_by: userEmail });
      if (list && list.length > 0) {
        await base44.asServiceRole.entities.BusinessSettings.update(list[0].id, { plan: 'free' });
      }
    }
  }

  return Response.json({ received: true });
});