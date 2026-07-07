import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM service_catalog WHERE is_active = TRUE ORDER BY category, name'
    );
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, category, default_price, icon } = req.body;
    if (!name) return res.status(400).json({ message: 'Service name is required.' });
    const { rows } = await pool.query(
      `INSERT INTO service_catalog (name, category, default_price, icon) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, category || 'general', default_price || 0, icon]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, category, default_price, icon, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE service_catalog SET
        name = COALESCE($1, name), category = COALESCE($2, category),
        default_price = COALESCE($3, default_price), icon = COALESCE($4, icon),
        is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [name, category, default_price, icon, is_active, req.params.id]
    );
    res.json(rows[0]);
  })
);

export default router;
