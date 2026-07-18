import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM expenses ORDER BY spent_at DESC');
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { description, category, amount, spent_at, recorded_by, items = [] } = req.body;
    if (!description || !amount) {
      return res.status(400).json({ message: 'description and amount are required.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO expenses (description, category, amount, spent_at, recorded_by, items)
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6) RETURNING *`,
      [description, category, amount, spent_at, recorded_by || null, JSON.stringify(items)]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { description, category, amount, spent_at, items = [] } = req.body;
    if (!description || !amount) {
      return res.status(400).json({ message: 'description and amount are required.' });
    }
    const { rows } = await pool.query(
      `UPDATE expenses SET
         description = $1,
         category = $2,
         amount = $3,
         spent_at = COALESCE($4, spent_at),
         items = $5
       WHERE id = $6 RETURNING *`,
      [description, category, amount, spent_at, JSON.stringify(items), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Expense not found.' });
    res.json(rows[0]);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Expense deleted.' });
  })
);

// Cashbook - daily opening/closing summaries
router.get(
  '/cashbook',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cashbook_entries ORDER BY entry_date DESC LIMIT 60');
    res.json(rows);
  })
);

router.post(
  '/cashbook',
  asyncHandler(async (req, res) => {
    const { entry_date, opening_float, cash_in, cash_out, actual_closing, notes } = req.body;
    const expected_closing = Number(opening_float || 0) + Number(cash_in || 0) - Number(cash_out || 0);
    const { rows } = await pool.query(
      `INSERT INTO cashbook_entries (entry_date, opening_float, cash_in, cash_out, expected_closing, actual_closing, notes)
       VALUES (COALESCE($1, CURRENT_DATE),$2,$3,$4,$5,$6,$7) RETURNING *`,
      [entry_date, opening_float || 0, cash_in || 0, cash_out || 0, expected_closing, actual_closing, notes]
    );
    res.status(201).json(rows[0]);
  })
);

export default router;
