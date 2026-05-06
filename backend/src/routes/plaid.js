import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

function plaidConfig() {
  const env = process.env.PLAID_ENV || 'sandbox';
  const baseUrls = {
    sandbox:     'https://sandbox.plaid.com',
    development: 'https://development.plaid.com',
    production:  'https://production.plaid.com',
  };
  return {
    clientId: process.env.PLAID_CLIENT_ID,
    secret:   process.env.PLAID_SECRET,
    baseUrl:  baseUrls[env] || baseUrls.sandbox,
  };
}

async function plaidFetch(path, body) {
  const { clientId, secret, baseUrl } = plaidConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });
  return res.json();
}

// POST /api/plaid/create-link-token
router.post('/create-link-token', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = await plaidFetch('/link/token/create', {
      client_name: 'WorkDay App',
      user: { client_user_id: req.user.id },
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plaid/exchange-token
router.post('/exchange-token', authenticate, requireAdmin, async (req, res) => {
  try {
    const { public_token } = req.body;
    const data = await plaidFetch('/item/public_token/exchange', { public_token });

    if (data.access_token) {
      await query(
        'UPDATE users SET plaid_access_token = $1, plaid_item_id = $2 WHERE id = $3',
        [data.access_token, data.item_id, req.user.id]
      );
    }

    res.json({ success: !!data.access_token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plaid/get-transactions
router.post('/get-transactions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query('SELECT plaid_access_token FROM users WHERE id = $1', [req.user.id]);
    const access_token = rows[0]?.plaid_access_token;
    if (!access_token) return res.status(400).json({ error: 'No bank connected' });

    const { start_date, end_date } = req.body;
    const defaultStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd   = new Date().toISOString().split('T')[0];

    const data = await plaidFetch('/transactions/get', {
      access_token,
      start_date: start_date || defaultStart,
      end_date:   end_date   || defaultEnd,
      options: { count: 250, offset: 0 },
    });

    res.json({ transactions: data.transactions || [], accounts: data.accounts || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
