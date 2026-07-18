import express from 'express';
import pool from '../db.js';

const router = express.Router();

const VALID_STATUSES = ['Pending', 'Designing', 'Printing', 'Completed', 'Delivered', 'Cancelled'];

// GET all branding jobs
router.get('/', async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    let query = `
      SELECT bj.*, c.name AS customer_name, c.phone AS customer_phone
      FROM branding_jobs bj
      LEFT JOIN customers c ON bj.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND bj.status = $${params.length}`;
    }
    if (customer_id) {
      params.push(customer_id);
      query += ` AND bj.customer_id = $${params.length}`;
    }
    query += ' ORDER BY bj.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch branding jobs.' });
  }
});

// GET single branding job
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT bj.*, c.name AS customer_name, c.phone AS customer_phone
       FROM branding_jobs bj
       LEFT JOIN customers c ON bj.customer_id = c.id
       WHERE bj.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Job not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch branding job.' });
  }
});

// POST create a new branding job
router.post('/', async (req, res) => {
  try {
    const {
      customer_id,
      job_type,
      description,
      quantity,
      unit_cost,
      selling_price,
      materials_used,
      due_date,
      notes,
    } = req.body;

    if (!job_type) {
      return res.status(400).json({ message: 'job_type is required.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO branding_jobs
        (customer_id, job_type, description, quantity, unit_cost, selling_price, materials_used, due_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending')
       RETURNING *`,
      [
        customer_id || null,
        job_type,
        description || '',
        quantity || 1,
        unit_cost || 0,
        selling_price || 0,
        materials_used || '',
        due_date || null,
        notes || '',
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create branding job: ' + err.message });
  }
});

// PUT update a branding job
router.put('/:id', async (req, res) => {
  try {
    const {
      customer_id,
      job_type,
      description,
      quantity,
      unit_cost,
      selling_price,
      materials_used,
      status,
      due_date,
      notes,
    } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const { rows } = await pool.query(
      `UPDATE branding_jobs SET
        customer_id    = COALESCE($1, customer_id),
        job_type       = COALESCE($2, job_type),
        description    = COALESCE($3, description),
        quantity       = COALESCE($4, quantity),
        unit_cost      = COALESCE($5, unit_cost),
        selling_price  = COALESCE($6, selling_price),
        materials_used = COALESCE($7, materials_used),
        status         = COALESCE($8, status),
        due_date       = COALESCE($9, due_date),
        notes          = COALESCE($10, notes),
        updated_at     = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        customer_id ?? null,
        job_type ?? null,
        description ?? null,
        quantity ?? null,
        unit_cost ?? null,
        selling_price ?? null,
        materials_used ?? null,
        status ?? null,
        due_date ?? null,
        notes ?? null,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Job not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update branding job: ' + err.message });
  }
});

// PATCH status-only quick update
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const { rows } = await pool.query(
      `UPDATE branding_jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Job not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status.' });
  }
});

// DELETE a branding job
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM branding_jobs WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: 'Job not found.' });
    res.json({ message: 'Branding job deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete branding job.' });
  }
});

export default router;
