import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(rows[0]);
  })
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { business_name, logo_url, theme_primary, currency, tax_rate, sender_id, invoice_prefix } = req.body;
    const { rows } = await pool.query(
      `UPDATE settings SET
        business_name = COALESCE($1, business_name),
        logo_url = COALESCE($2, logo_url),
        theme_primary = COALESCE($3, theme_primary),
        currency = COALESCE($4, currency),
        tax_rate = COALESCE($5, tax_rate),
        sender_id = COALESCE($6, sender_id),
        invoice_prefix = COALESCE($7, invoice_prefix)
       WHERE id = 1 RETURNING *`,
      [business_name, logo_url, theme_primary, currency, tax_rate, sender_id, invoice_prefix]
    );
    res.json(rows[0]);
  })
);

// ─── USER MANAGEMENT (Admin controls) ──────────────────────────────────────────

// List users with permissions
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active, permissions, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  })
);

// Add new staff/user
router.post(
  '/users',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const defaultPerms = permissions || ['expenses', 'profits', 'inventory', 'invoices', 'sms', 'settings'];
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, permissions)
       VALUES ($1, $2, $3, COALESCE($4, 'attendant'), $5)
       RETURNING id, name, email, role, permissions, is_active, created_at`,
      [name, email.toLowerCase().trim(), passwordHash, role, defaultPerms]
    );

    res.status(201).json(rows[0]);
  })
);

// Update user settings (role, active state, permissions)
router.put(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const { role, is_active, permissions } = req.body;
    
    // Update fields dynamically
    const { rows } = await pool.query(
      `UPDATE users SET
        role = COALESCE($1, role),
        is_active = COALESCE($2, is_active),
        permissions = COALESCE($3, permissions)
       WHERE id = $4
       RETURNING id, name, email, role, is_active, permissions`,
      [role, is_active, permissions, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  })
);

// Delete user profile
router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User profile deleted successfully.' });
  })
);

// Get sales audit logs (served by info) for the super admin
router.get(
  '/users/logs',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.id, t.created_at, t.description, t.module, t.total_amount,
              u.name AS served_by_name, u.email AS served_by_email,
              c.name AS customer_name, c.business_name AS customer_business
       FROM transactions t
       LEFT JOIN users u ON u.id = t.served_by
       LEFT JOIN customers c ON c.id = t.customer_id
       ORDER BY t.created_at DESC
       LIMIT 1000`
    );
    res.json(rows);
  })
);

export default router;
