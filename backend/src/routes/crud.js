import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

/**
 * Creates a standard CRUD router for a given table.
 * All records are scoped to req.user.business_id automatically.
 *
 * @param {string} table - PostgreSQL table name
 * @param {string[]} writableFields - Fields allowed in create/update
 * @param {object} opts
 * @param {boolean} opts.adminOnly - Require admin role for write operations (default true)
 * @param {boolean} opts.publicRead - Allow unauthenticated GET list/filter (for booking public page)
 * @param {string} opts.businessIdParam - Query param to filter by business on public routes
 */
export function crudRouter(table, writableFields, opts = {}) {
  const { adminOnly = true, publicRead = false, businessIdParam = 'business_id' } = opts;
  const router = Router();

  const readMiddleware = publicRead ? [] : [authenticate];
  const writeMiddleware = adminOnly ? [authenticate, requireAdmin] : [authenticate];

  // ── LIST / FILTER ──────────────────────────────────────────────────────────
  router.get('/', ...readMiddleware, async (req, res) => {
    try {
      const conditions = [];
      const values = [];
      let paramIdx = 1;

      if (publicRead && !req.user) {
        // Public access: require explicit business_id param
        const bid = req.query[businessIdParam];
        if (!bid) return res.status(400).json({ error: `${businessIdParam} is required` });
        conditions.push(`business_id = $${paramIdx++}`);
        values.push(bid);
      } else {
        conditions.push(`business_id = $${paramIdx++}`);
        values.push(req.user.business_id);
      }

      // Additional filters from query string (only whitelisted fields)
      const filterableFields = [...writableFields, 'id', 'status', 'employee_id', 'job_id', 'date'];
      for (const [key, val] of Object.entries(req.query)) {
        if (key === businessIdParam) continue;
        if (filterableFields.includes(key)) {
          conditions.push(`${key} = $${paramIdx++}`);
          values.push(val);
        }
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT * FROM ${table} ${where} ORDER BY created_at DESC`,
        values
      );
      res.json(rows);
    } catch (err) {
      console.error(`GET ${table} error:`, err);
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // ── GET ONE ────────────────────────────────────────────────────────────────
  router.get('/:id', ...readMiddleware, async (req, res) => {
    try {
      const conditions = ['id = $1'];
      const values = [req.params.id];

      if (!publicRead || req.user) {
        conditions.push('business_id = $2');
        values.push(req.user.business_id);
      }

      const { rows } = await query(
        `SELECT * FROM ${table} WHERE ${conditions.join(' AND ')} LIMIT 1`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(`GET ${table}/:id error:`, err);
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // ── CREATE ─────────────────────────────────────────────────────────────────
  router.post('/', ...writeMiddleware, async (req, res) => {
    try {
      const data = pick(req.body, writableFields);
      data.business_id = req.user.business_id;

      const cols = Object.keys(data);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        Object.values(data)
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(`POST ${table} error:`, err);
      res.status(500).json({ error: 'Create failed', detail: err.message });
    }
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  router.patch('/:id', ...writeMiddleware, async (req, res) => {
    try {
      const data = pick(req.body, writableFields);
      if (!Object.keys(data).length) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      const setClauses = Object.keys(data).map((k, i) => `${k} = $${i + 3}`).join(', ');
      const values = [req.params.id, req.user.business_id, ...Object.values(data)];

      const { rows } = await query(
        `UPDATE ${table} SET ${setClauses}
         WHERE id = $1 AND business_id = $2
         RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(`PATCH ${table}/:id error:`, err);
      res.status(500).json({ error: 'Update failed', detail: err.message });
    }
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────
  router.delete('/:id', ...writeMiddleware, async (req, res) => {
    try {
      const { rows } = await query(
        `DELETE FROM ${table} WHERE id = $1 AND business_id = $2 RETURNING id`,
        [req.params.id, req.user.business_id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, id: rows[0].id });
    } catch (err) {
      console.error(`DELETE ${table}/:id error:`, err);
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  return router;
}

function pick(obj, keys) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));
}
