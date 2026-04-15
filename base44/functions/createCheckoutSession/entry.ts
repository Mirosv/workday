import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

async function getStripeConfig(base44) {
  const config = {
    secretKey: Deno.env.get('STRIPE_SECRET_KEY'),
    pricePro: Deno.env.get('STRIPE_PRICE_PRO'),
    pricePremium: Deno.env.get('STRIPE_PRICE_PREMIUM'),
  };

  // Fallback: read from DB config if env vars not set
  if (!config.secretKey || !config.pricePro || !config.pricePremium) {
    const records = await base44.asServiceRole.entities.BusinessSettings.filter({ owner_email: '__stripe_config__' });
    if (records && records.length > 0) {
      let stored = {};
      try { stored = JSON.parse(records[0].notes || '{}'); } catch {}
      config.secretKey = config.secretKey || stored['STRIPE_SECRET_KEY'];
      config.pricePro = config.pricePro || stored['STRIPE_PRICE_PRO'];
      config.pricePremium = config.pricePremium || stored['STRIPE_PRICE_PREMIUM'];
    }
  }

  return config;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan, success_url, cancel_url } = await req.json();

    const config = await getStripeConfig(base44);

    if (!config.secretKey) {
      return Response.json({ error: 'Stripe no configurado. Configura STRIPE_SECRET_KEY en Super Admin.' }, { status: 500 });
    }

    const PRICE_IDS = {
      pro: config.pricePro,
      premium: config.pricePremium,
    };

    if (!plan || !PRICE_IDS[plan]) {
      return Response.json({ error: `Plan inválido o Price ID no configurado para: ${plan}` }, { status: 400 });
    }

    const stripe = new Stripe(config.secretKey);

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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});