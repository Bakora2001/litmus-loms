import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, priority, assigned_to } = req.query;
    const clauses = [];
    const params = [];
    if (status) { params.push(status); clauses.push(`t.status = $${params.length}`); }
    if (priority) { params.push(priority); clauses.push(`t.priority = $${params.length}`); }
    if (assigned_to) { params.push(assigned_to); clauses.push(`t.assigned_to = $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT t.*, c.name AS client_name, u.name AS assigned_to_name
       FROM tasks t
       LEFT JOIN customers c ON c.id = t.client_id
       LEFT JOIN users u ON u.id = t.assigned_to
       ${where}
       ORDER BY t.deadline ASC NULLS LAST`,
      params
    );
    res.json(rows);
  })
);

router.get(
  '/upcoming',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.*, c.name AS client_name FROM tasks t
       LEFT JOIN customers c ON c.id = t.client_id
       WHERE t.deadline >= NOW() AND t.status NOT IN ('completed','cancelled')
       ORDER BY t.deadline ASC LIMIT 10`
    );
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, client_id, description, deadline, priority, assigned_to, reminder_before, notify_email, notify_sms } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required.' });

    const { rows } = await pool.query(
      `INSERT INTO tasks (title, client_id, description, deadline, priority, assigned_to, reminder_before, notify_email, notify_sms)
       VALUES ($1,$2,$3,$4,COALESCE($5,'medium'),$6,COALESCE($7,'1_day'),COALESCE($8,true),COALESCE($9,false))
       RETURNING *`,
      [title, client_id || null, description, deadline || null, priority, assigned_to || null, reminder_before, notify_email, notify_sms]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { title, client_id, description, deadline, priority, status, assigned_to, reminder_before } = req.body;
    const { rows } = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title), client_id = COALESCE($2, client_id),
        description = COALESCE($3, description), deadline = COALESCE($4, deadline),
        priority = COALESCE($5, priority), status = COALESCE($6, status),
        assigned_to = COALESCE($7, assigned_to), reminder_before = COALESCE($8, reminder_before),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [title, client_id, description, deadline, priority, status, assigned_to, reminder_before, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Task not found.' });
    res.json(rows[0]);
  })
);

// Quick drag-and-drop status update
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { rows } = await pool.query(
      'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rows[0]);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted.' });
  })
);

export default router;
