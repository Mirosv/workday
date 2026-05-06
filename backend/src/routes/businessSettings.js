import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

const WRITABLE = [
  'business_name','business_phone','business_address','logo_url',
  'default_labor_rate','default_overhead_pct','default_profit_pct',
  'language','plan','status','plan_expires_at','notes',
];

// GET /api/business-settings — returns current user's business settings
router.get('/', authenticate, async (req, res) => {
  try {
    let settings;
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      const { rows } = await query(
        'SELECT * FROM business_settings WHERE owner_id = $1 LIMIT 1',
        [req.user.id]
      );
      settings = rows[0] ?? null;
    } else {
      // Employee: find settings via their business_id
      if (!req.user.business_id) return res.json(null);
      const { rows } = await query(
        'SELECT * FROM business_settings WHERE id = $1 LIMIT 1',
        [req.user.business_id]
      );
      settings = rows[0] ?? null;
    }
    res.json(settings);
  } catch (err) {
    console.error('GET business-settings error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// PATCH /api/business-settings — update current user's business settings
router.patch('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => WRITABLE.includes(k))
    );
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const setClauses = Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = [req.user.id, ...Object.values(data)];

    const { rows } = await query(
      `UPDATE business_settings SET ${setClauses}
       WHERE owner_id = $1 RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Business settings not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH business-settings error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── Super Admin: list all businesses ─────────────────────────────────────────
router.get('/all', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT bs.*, u.email as user_email, u.full_name as user_full_name
       FROM business_settings bs
       JOIN users u ON u.id = bs.owner_id
       ORDER BY bs.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// PATCH /api/business-settings/admin/:id — super admin updates any business
router.patch('/admin/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const allowed = [...WRITABLE, 'plan', 'status', 'plan_expires_at'];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const setClauses = Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await query(
      `UPDATE business_settings SET ${setClauses} WHERE id = $1 RETURNING *`,
      [req.params.id, ...Object.values(data)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
