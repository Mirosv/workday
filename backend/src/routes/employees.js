import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const WRITABLE = [
  'full_name','email','phone','role','position',
  'hourly_rate','status','lunch_break_minutes','lunch_paid','notes',
  'business_owner_email',
];

// GET /api/employees
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = ['business_id = $1'];
    const values = [req.user.business_id];
    let p = 2;

    if (req.query.status) { filters.push(`status = $${p++}`); values.push(req.query.status); }
    if (req.query.email)  { filters.push(`email = $${p++}`);  values.push(req.query.email); }

    const { rows } = await query(
      `SELECT * FROM employees WHERE ${filters.join(' AND ')} ORDER BY full_name ASC`,
      values
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM employees WHERE id = $1 AND business_id = $2 LIMIT 1',
      [req.params.id, req.user.business_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// POST /api/employees — create employee + optional user account
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = pick(req.body, WRITABLE);
    data.business_id = req.user.business_id;
    data.business_owner_email = req.user.email;

    // If password provided, create/link a user account for this employee
    let userId = null;
    if (req.body.password && data.email) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
      if (existing.rows.length) {
        userId = existing.rows[0].id;
      } else {
        const hash = await bcrypt.hash(req.body.password, 12);
        const { rows: newUser } = await query(
          `INSERT INTO users (email, password_hash, full_name, role)
           VALUES ($1, $2, $3, 'employee') RETURNING id`,
          [data.email.toLowerCase(), hash, data.full_name]
        );
        userId = newUser[0].id;
      }
    }

    if (userId) data.user_id = userId;

    const cols = Object.keys(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO employees (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      Object.values(data)
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST employees error:', err);
    res.status(500).json({ error: 'Create failed', detail: err.message });
  }
});

// PATCH /api/employees/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = pick(req.body, WRITABLE);
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const setClauses = Object.keys(data).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const { rows } = await query(
      `UPDATE employees SET ${setClauses}
       WHERE id = $1 AND business_id = $2 RETURNING *`,
      [req.params.id, req.user.business_id, ...Object.values(data)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      'DELETE FROM employees WHERE id = $1 AND business_id = $2 RETURNING id',
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
