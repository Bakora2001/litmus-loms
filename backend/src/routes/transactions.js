import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function computeStatus(total, paid) {
  if (paid <= 0) return 'pending';
  if (paid >= total) return 'paid';
  return 'partial';
}

// List transactions - filterable by module, status, customer
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { module, status, customer_id, from, to } = req.query;
    const clauses = [];
    const params = [];

    if (module) {
      params.push(module);
      clauses.push(`t.module = $${params.length}`);
    }
    if (status) {
      params.push(status);
      clauses.push(`t.status = $${params.length}`);
    }
    if (customer_id) {
      params.push(customer_id);
      clauses.push(`t.customer_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      clauses.push(`t.created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      clauses.push(`t.created_at <= $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT t.*, c.name AS customer_name, c.phone AS customer_phone, u.name AS served_by_name
       FROM transactions t
       LEFT JOIN customers c ON c.id = t.customer_id
       LEFT JOIN users u ON u.id = t.served_by
       ${where}
       ORDER BY t.created_at DESC
       LIMIT 500`,
      params
    );
    res.json(rows);
  })
);

// Debt tracker - all outstanding balances grouped by customer
router.get(
  '/debts/summary',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT c.id AS customer_id, c.name, c.phone,
        SUM(t.balance) AS total_balance,
        COUNT(t.id) AS open_items,
        MIN(t.due_date) AS earliest_due_date
       FROM transactions t
       JOIN customers c ON c.id = t.customer_id
       WHERE t.status != 'paid'
       GROUP BY c.id, c.name, c.phone
       HAVING SUM(t.balance) > 0
       ORDER BY total_balance DESC`
    );
    res.json(rows);
  })
);

// Create a new transaction (cyber service or product sale)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      customer_id,
      customer_phone,
      module,
      service_id,
      product_id,
      description,
      quantity = 1,
      unit_price,
      amount_paid = 0,
      served_by,
      due_date,
    } = req.body;

    if (!module || !description || unit_price === undefined) {
      return res.status(400).json({ message: 'module, description and unit_price are required.' });
    }

    let finalCustomerId = customer_id || null;

    // Allow quick-record by phone number, auto-creating the customer
    if (!finalCustomerId && customer_phone) {
      const existing = await pool.query('SELECT id FROM customers WHERE phone = $1', [customer_phone]);
      if (existing.rows[0]) {
        finalCustomerId = existing.rows[0].id;
      } else {
        const created = await pool.query(
          'INSERT INTO customers (phone) VALUES ($1) RETURNING id',
          [customer_phone]
        );
        finalCustomerId = created.rows[0].id;
      }
    }

    const total = Number(quantity) * Number(unit_price);
    const status = computeStatus(total, Number(amount_paid));
    const activeServedBy = req.user?.id || served_by || null;

    // Deduct stock if it's a product sale
    if (module === 'product_sale' && product_id) {
      await pool.query(
        'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
        [quantity, product_id]
      );
      await pool.query(
        `INSERT INTO stock_movements (product_id, change_qty, reason, created_by)
         VALUES ($1, $2, 'sale', $3)`,
        [product_id, -Math.abs(quantity), activeServedBy]
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO transactions
        (customer_id, module, service_id, product_id, description, quantity, unit_price, total_amount, amount_paid, status, served_by, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        finalCustomerId,
        module,
        service_id || null,
        product_id || null,
        description,
        quantity,
        unit_price,
        total,
        amount_paid,
        status,
        activeServedBy,
        due_date || null,
      ]
    );

    if (Number(amount_paid) > 0) {
      await pool.query(
        `INSERT INTO payments (transaction_id, amount, received_by) VALUES ($1,$2,$3)`,
        [rows[0].id, amount_paid, activeServedBy]
      );
    }

    res.status(201).json(rows[0]);
  })
);

// Receive a payment against an existing transaction (full or partial)
router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, method = 'cash', received_by } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A valid payment amount is required.' });
    }

    const txResult = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    const tx = txResult.rows[0];
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });

    const newPaid = Number(tx.amount_paid) + Number(amount);
    const status = computeStatus(Number(tx.total_amount), newPaid);

    const updated = await pool.query(
      `UPDATE transactions SET amount_paid = $1, status = $2 WHERE id = $3 RETURNING *`,
      [newPaid, status, id]
    );

    await pool.query(
      `INSERT INTO payments (transaction_id, amount, method, received_by) VALUES ($1,$2,$3,$4)`,
      [id, amount, method, received_by || null]
    );

    res.json(updated.rows[0]);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Transaction deleted.' });
  })
);

export default router;
