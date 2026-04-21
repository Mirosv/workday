import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SANDBOX_SECRET');
const PLAID_BASE = 'https://sandbox.plaid.com';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const { start_date, end_date } = await req.json();
  const access_token = user.plaid_access_token;

  if (!access_token) return Response.json({ error: 'No bank connected' }, { status: 400 });

  const res = await fetch(`${PLAID_BASE}/transactions/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      access_token,
      start_date: start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: end_date || new Date().toISOString().split('T')[0],
      options: { count: 250, offset: 0 },
    }),
  });
  const data = await res.json();
  return Response.json({ transactions: data.transactions || [], accounts: data.accounts || [] });
});