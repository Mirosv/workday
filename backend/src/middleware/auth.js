import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { rows } = await query('SELECT id, email, full_name, role, plaid_access_token, plaid_item_id FROM users WHERE id = $1', [payload.sub]);
  if (!rows.length) return res.status(401).json({ error: 'User not found' });

  req.user = rows[0];

  // Attach business_id for non-super-admin users
  if (req.user.role !== 'super_admin') {
    if (req.user.role === 'admin') {
      const { rows: bs } = await query(
        'SELECT id FROM business_settings WHERE owner_id = $1 LIMIT 1',
        [req.user.id]
      );
      req.user.business_id = bs[0]?.id ?? null;
    } else {
      // Employee: find their employee record to get business_id
      const { rows: emp } = await query(
        'SELECT business_id FROM employees WHERE user_id = $1 AND status = $2 LIMIT 1',
        [req.user.id, 'active']
      );
      req.user.business_id = emp[0]?.business_id ?? null;
    }
  }

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export const requireAdmin = requireRole('admin', 'super_admin');
export const requireSuperAdmin = requireRole('super_admin');
