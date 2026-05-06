import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../config/db.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

async function getStripeConfig(businessId) {
  const { rows } = await query(
    `SELECT stripe_secret_key, stripe_webhook_secret, stripe_price_pro, stripe_price_premium
     FROM business_settings WHERE id = $1 LIMIT 1`,
    [businessId]
  );
  const cfg = rows[0] ?? {};
  return {
    secretKey:      process.env.STRIPE_SECRET_KEY      || cfg.stripe_secret_key,
    webhookSecret:  process.env.STRIPE_WEBHOOK_SECRET  || cfg.stripe_webhook_secret,
    pricePro:       process.env.STRIPE_PRICE_PRO       || cfg.stripe_price_pro,
    pricePremium:   process.env.STRIPE_PRICE_PREMIUM   || cfg.stripe_price_premium,
  };
}

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', authenticate, requireAdmin, async (req, res) => {
  try {
    const { plan, success_url, cancel_url } = req.body;
    const cfg = await getStripeConfig(req.user.business_id);

    if (!cfg.secretKey) {
      return res.status(500).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY in Super Admin.' });
    }

    const PRICES = { pro: cfg.pricePro, premium: cfg.pricePremium };
    if (!plan || !PRICES[plan]) {
      return res.status(400).json({ error: `Invalid plan or Price ID not configured for: ${plan}` });
    }

    const stripe = new Stripe(cfg.secretKey);
    const origin = req.headers.origin || process.env.FRONTEND_URL;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      success_url: success_url || `${origin}/settings?plan_success=1`,
      cancel_url:  cancel_url  || `${origin}/settings`,
      metadata: { user_email: req.user.email, plan, business_id: req.user.business_id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/webhook — raw body required (configured in index.js)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  // Use first available webhook secret (env takes priority)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    return res.json({ received: true });
  }

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { business_id, plan } = session.metadata ?? {};
    if (business_id && plan) {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      await query(
        `UPDATE business_settings SET plan = $1, status = 'active', plan_expires_at = $2 WHERE id = $3`,
        [plan, expires.toISOString().split('T')[0], business_id]
      );
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(sub.customer);
    if (customer.email) {
      await query(
        `UPDATE business_settings SET plan = 'free'
         WHERE owner_id = (SELECT id FROM users WHERE email = $1 LIMIT 1)`,
        [customer.email]
      );
    }
  }

  res.json({ received: true });
});

// POST /api/stripe/save-config — super admin only
router.post('/save-config', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const ALLOWED = ['stripe_secret_key', 'stripe_webhook_secret', 'stripe_price_pro', 'stripe_price_premium'];
    const { key, value, business_id } = req.body;

    if (!ALLOWED.includes(key)) {
      return res.status(400).json({ error: 'Invalid key' });
    }
    if (!value?.trim()) {
      return res.status(400).json({ error: 'Value cannot be empty' });
    }

    // Store on a specific business or globally (env var recommended for global)
    if (business_id) {
      await query(`UPDATE business_settings SET ${key} = $1 WHERE id = $2`, [value, business_id]);
    } else {
      // Store on super admin's own business record as a fallback config store
      await query(
        `UPDATE business_settings SET ${key} = $1
         WHERE owner_id = (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)`,
        [value]
      );
    }

    res.json({ success: true, message: `${key} saved.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
