import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const WRITABLE = [
  'client_name','client_phone','client_email','service',
  'notes','date','time_slot','status','internal_notes',
];

// GET /api/bookings — admin sees all; public access by business_id param
router.get('/', async (req, res) => {
  try {
    let businessId;
    if (req.headers.authorization) {
      // Authenticated: scope to own business
      const { authenticate: auth } = await import('../middleware/auth.js');
      // manual auth check
      const jwt = (await import('jsonwebtoken')).default;
      const token = req.headers.authorization?.slice(7);
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const { rows: u } = await query('SELECT id, role FROM users WHERE id = $1', [payload.sub]);
        if (u.length) {
          const user = u[0];
          if (user.role === 'admin') {
            const { rows: bs } = await query('SELECT id FROM business_settings WHERE owner_id = $1 LIMIT 1', [user.id]);
            businessId = bs[0]?.id;
          }
        }
      } catch {}
    }

    if (!businessId) {
      businessId = req.query.business_id;
      if (!businessId) return res.status(400).json({ error: 'business_id required for public access' });
    }

    const filters = ['business_id = $1'];
    const values = [businessId];
    let p = 2;

    if (req.query.status) { filters.push(`status = $${p++}`); values.push(req.query.status); }
    if (req.query.date)   { filters.push(`date = $${p++}`);   values.push(req.query.date); }

    const { rows } = await query(
      `SELECT * FROM bookings WHERE ${filters.join(' AND ')} ORDER BY date DESC, time_slot ASC`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error('GET bookings error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// POST /api/bookings/public — no auth required (public booking form)
router.post('/public', async (req, res) => {
  try {
    const { business_id, ...rest } = req.body;
    if (!business_id) return res.status(400).json({ error: 'business_id required' });

    const data = pick(rest, WRITABLE);
    data.business_id = business_id;

    const cols = Object.keys(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO bookings (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      Object.values(data)
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST bookings/public error:', err);
    res.status(500).json({ error: 'Booking failed', detail: err.message });
  }
});

// POST /api/bookings — authenticated admin
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = pick(req.body, WRITABLE);
    data.business_id = req.user.business_id;
    const cols = Object.keys(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO bookings (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      Object.values(data)
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Create failed', detail: err.message });
  }
});

// PATCH /api/bookings/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = pick(req.body, WRITABLE);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No valid fields' });

    const setClauses = Object.keys(data).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const { rows } = await query(
      `UPDATE bookings SET ${setClauses} WHERE id = $1 AND business_id = $2 RETURNING *`,
      [req.params.id, req.user.business_id, ...Object.values(data)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      'DELETE FROM bookings WHERE id = $1 AND business_id = $2 RETURNING id',
      [req.params.id, req.user.business_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

function pick(obj, keys) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));
}

export default router;
