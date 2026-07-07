import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// List + search customers
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search = '', tag, vip } = req.query;
    const clauses = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(
        `(phone ILIKE $${params.length} OR name ILIKE $${params.length} OR business_name ILIKE $${params.length})`
      );
    }
    if (tag) {
      params.push(tag);
      clauses.push(`$${params.length} = ANY(tags)`);
    }
    if (vip === 'true') {
      clauses.push('is_vip = TRUE');
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT c.*,
        (SELECT COALESCE(SUM(balance),0) FROM transactions t WHERE t.customer_id = c.id AND t.status != 'paid') AS outstanding_balance,
        (SELECT COUNT(*) FROM transactions t WHERE t.customer_id = c.id) AS total_transactions
       FROM customers c
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );
    res.json(rows);
  })
);

// Get single customer + full timeline
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Customer not found.' });

    const timeline = await pool.query(
      `SELECT id, module, description, quantity, unit_price, total_amount, amount_paid, balance, status, created_at, due_date
       FROM transactions WHERE customer_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ ...rows[0], timeline: timeline.rows });
  })
);

// Search by phone (Smart Service History)
router.get(
  '/phone/:phone',
  asyncHandler(async (req, res) => {
    const { phone } = req.params;
    const { rows } = await pool.query('SELECT * FROM customers WHERE phone = $1', [phone]);
    if (!rows[0]) return res.status(404).json({ message: 'No customer found with that phone number.' });

    const timeline = await pool.query(
      `SELECT id, module, description, total_amount, status, created_at
       FROM transactions WHERE customer_id = $1 ORDER BY created_at DESC`,
      [rows[0].id]
    );
    res.json({ ...rows[0], timeline: timeline.rows });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { phone, name, email, business_name, location, tags, notes, is_vip } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    const { rows } = await pool.query(
      `INSERT INTO customers (phone, name, email, business_name, location, tags, notes, is_vip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,false))
       ON CONFLICT (phone) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, customers.name),
        updated_at = NOW()
       RETURNING *`,
      [phone, name, email, business_name, location, tags || [], notes, is_vip]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, business_name, location, tags, notes, is_vip } = req.body;
    const { rows } = await pool.query(
      `UPDATE customers SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        business_name = COALESCE($3, business_name),
        location = COALESCE($4, location),
        tags = COALESCE($5, tags),
        notes = COALESCE($6, notes),
        is_vip = COALESCE($7, is_vip),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, email, business_name, location, tags, notes, is_vip, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Customer not found.' });
    res.json(rows[0]);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Customer deleted.' });
  })
);

export default router;
