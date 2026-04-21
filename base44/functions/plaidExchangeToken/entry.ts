import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SANDBOX_SECRET');
const PLAID_BASE = 'https://sandbox.plaid.com';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const { public_token } = await req.json();

  const res = await fetch(`${PLAID_BASE}/item/public_token/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      public_token,
    }),
  });
  const data = await res.json();

  if (data.access_token) {
    // Store access token on the user record
    await base44.auth.updateMe({ plaid_access_token: data.access_token, plaid_item_id: data.item_id });
  }

  return Response.json({ success: !!data.access_token });
});