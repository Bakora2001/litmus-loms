import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function computeStatus(total, paid) {
  if (paid <= 0) return 'pending';
  if (paid >= total) return 'paid';
  return 'partial';
}

// List transactions - filterable by module, status, customer, date range
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { module, status, customer_id, from, to, search } = req.query;
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
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(t.description ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT t.*, c.name AS customer_name, c.phone AS customer_phone, u.name AS served_by_name
       FROM transactions t
       LEFT JOIN customers c ON c.id = t.customer_id
       LEFT JOIN users u ON u.id = t.served_by
       ${where}
       ORDER BY t.created_at DESC
       LIMIT 1000`,
      params
    );
    res.json(rows);
  })
);

// Debt tracker - all outstanding balances grouped by customer (with optional date filter)
router.get(
  '/debts/summary',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const clauses = ["t.status != 'paid'"];
    const params = [];
    if (from) { params.push(from); clauses.push(`t.created_at >= $${params.length}`); }
    if (to)   { params.push(to);   clauses.push(`t.created_at <= $${params.length}`); }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const { rows } = await pool.query(
      `SELECT c.id AS customer_id, c.name, c.phone,
        SUM(t.balance) AS total_balance,
        COUNT(t.id) AS open_items,
        MIN(t.due_date) AS earliest_due_date
       FROM transactions t
       JOIN customers c ON c.id = t.customer_id
       ${where}
       GROUP BY c.id, c.name, c.phone
       HAVING SUM(t.balance) > 0
       ORDER BY total_balance DESC`,
      params
    );
    res.json(rows);
  })
);

// Get payment history for a specific transaction
router.get(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT p.*, u.name AS received_by_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.received_by
       WHERE p.transaction_id = $1
       ORDER BY p.created_at ASC`,
      [id]
    );
    res.json(rows);
  })
);

// Get single transaction detail with payments
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const txRes = await pool.query(
      `SELECT t.*, c.name AS customer_name, c.phone AS customer_phone
       FROM transactions t
       LEFT JOIN customers c ON c.id = t.customer_id
       WHERE t.id = $1`,
      [id]
    );
    if (!txRes.rows[0]) return res.status(404).json({ message: 'Transaction not found.' });

    const payments = await pool.query(
      `SELECT p.*, u.name AS received_by_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.received_by
       WHERE p.transaction_id = $1
       ORDER BY p.created_at ASC`,
      [id]
    );
    res.json({ ...txRes.rows[0], payments: payments.rows });
  })
);

// Create a new transaction (cyber service or product sale)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      customer_id,
      customer_phone,
      customer_name,
      customer_email,
      module,
      service_id,
      product_id,
      description,
      quantity = 1,
      unit_price,
      amount_paid = 0,
      payment_status, // 'paid' | 'partial' | 'not_paid'
      served_by,
      due_date,
    } = req.body;

    if (!module || !description || unit_price === undefined) {
      return res.status(400).json({ message: 'module, description and unit_price are required.' });
    }

    let finalCustomerId = customer_id || null;

    // Auto-create or find customer by phone
    if (!finalCustomerId && (customer_phone || customer_name)) {
      if (customer_phone) {
        const existing = await pool.query('SELECT id FROM customers WHERE phone = $1', [customer_phone]);
        if (existing.rows[0]) {
          finalCustomerId = existing.rows[0].id;
          // Update name/email if provided
          if (customer_name || customer_email) {
            await pool.query(
              `UPDATE customers SET
                name = COALESCE($1, name),
                email = COALESCE($2, email),
                updated_at = NOW()
               WHERE id = $3`,
              [customer_name || null, customer_email || null, finalCustomerId]
            );
          }
        } else {
          const created = await pool.query(
            `INSERT INTO customers (phone, name, email) VALUES ($1, $2, $3) RETURNING id`,
            [customer_phone, customer_name || null, customer_email || null]
          );
          finalCustomerId = created.rows[0].id;
        }
      }
    }

    const total = Number(quantity) * Number(unit_price);

    // Determine status from payment_status selector or amount_paid
    let status;
    if (payment_status === 'paid') {
      status = 'paid';
    } else if (payment_status === 'partial') {
      status = 'partial';
    } else if (payment_status === 'not_paid') {
      status = 'pending';
    } else {
      status = computeStatus(total, Number(amount_paid));
    }

    const finalAmountPaid = payment_status === 'paid' ? total
      : payment_status === 'not_paid' ? 0
      : Number(amount_paid);

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
        finalAmountPaid,
        status,
        activeServedBy,
        due_date || null,
      ]
    );

    if (finalAmountPaid > 0) {
      await pool.query(
        `INSERT INTO payments (transaction_id, amount, received_by) VALUES ($1,$2,$3)`,
        [rows[0].id, finalAmountPaid, activeServedBy]
      );
    }

    res.status(201).json(rows[0]);
  })
);

// Edit a transaction
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { description, unit_price, quantity, due_date } = req.body;

    const tx = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (!tx.rows[0]) return res.status(404).json({ message: 'Transaction not found.' });

    const newUnitPrice = unit_price !== undefined ? Number(unit_price) : Number(tx.rows[0].unit_price);
    const newQty = quantity !== undefined ? Number(quantity) : Number(tx.rows[0].quantity);
    const newTotal = newUnitPrice * newQty;
    const currentPaid = Number(tx.rows[0].amount_paid);
    const newStatus = computeStatus(newTotal, currentPaid);

    const { rows } = await pool.query(
      `UPDATE transactions SET
        description = COALESCE($1, description),
        unit_price = $2,
        quantity = $3,
        total_amount = $4,
        status = $5,
        due_date = COALESCE($6, due_date),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [description || null, newUnitPrice, newQty, newTotal, newStatus, due_date || null, id]
    );
    res.json(rows[0]);
  })
);

// Receive a payment against an existing transaction (full or partial)
router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, method = 'cash' } = req.body;
    const received_by = req.user?.id || req.body.received_by || null;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A valid payment amount is required.' });
    }

    const txResult = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    const tx = txResult.rows[0];
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });

    // Validation: Prevent overpayment
    const currentBalance = Number(tx.total_amount) - Number(tx.amount_paid);
    if (Number(amount) > currentBalance) {
      return res.status(400).json({ 
        message: `Payment amount (KES ${Number(amount).toLocaleString()}) exceeds remaining balance (KES ${currentBalance.toLocaleString()}). Maximum payment allowed is KES ${currentBalance.toLocaleString()}.` 
      });
    }

    const newPaid = Number(tx.amount_paid) + Number(amount);
    const status = computeStatus(Number(tx.total_amount), newPaid);

    const updated = await pool.query(
      `UPDATE transactions SET amount_paid = $1, status = $2 WHERE id = $3 RETURNING *`,
      [newPaid, status, id]
    );

    const payment = await pool.query(
      `INSERT INTO payments (transaction_id, amount, method, received_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, amount, method, received_by]
    );

    res.json({ transaction: updated.rows[0], payment: payment.rows[0] });
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
