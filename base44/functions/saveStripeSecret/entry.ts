import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'valerio.miros85@gmail.com';
const ALLOWED_KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_PREMIUM'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { key, value } = await req.json();

    if (!ALLOWED_KEYS.includes(key)) {
      return Response.json({ error: 'Invalid key' }, { status: 400 });
    }

    if (!value || value.trim() === '') {
      return Response.json({ error: 'Value cannot be empty' }, { status: 400 });
    }

    // Store in env — since Deno env can't be set at runtime, we update the entity-based config
    // as a workaround, store in a dedicated config entity record readable only by service role
    await base44.asServiceRole.entities.BusinessSettings.filter({ owner_email: '__stripe_config__' }).then(async (existing) => {
      const configData = { owner_email: '__stripe_config__', notes: JSON.stringify({ [key]: value }) };
      if (existing && existing.length > 0) {
        const current = existing[0];
        let stored = {};
        try { stored = JSON.parse(current.notes || '{}'); } catch {}
        stored[key] = value;
        await base44.asServiceRole.entities.BusinessSettings.update(current.id, { notes: JSON.stringify(stored) });
      } else {
        await base44.asServiceRole.entities.BusinessSettings.create({ owner_email: '__stripe_config__', business_name: 'Stripe Config', notes: JSON.stringify({ [key]: value }) });
      }
    });

    return Response.json({ success: true, message: `${key} guardado correctamente.` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});