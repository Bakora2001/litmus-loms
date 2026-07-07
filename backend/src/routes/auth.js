import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    delete user.password_hash;
    res.json({ token, user });
  })
);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const defaultPerms = permissions || ['expenses', 'profits', 'inventory', 'invoices', 'sms', 'settings'];
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, permissions)
       VALUES ($1, $2, $3, COALESCE($4, 'attendant'), $5)
       RETURNING id, name, email, role, permissions, created_at`,
      [name, email.toLowerCase().trim(), passwordHash, role, defaultPerms]
    );

    const token = signToken(rows[0]);
    res.status(201).json({ token, user: rows[0] });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, avatar_url, permissions, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  })
);

export default router;
