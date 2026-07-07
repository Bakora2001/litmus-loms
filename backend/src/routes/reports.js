import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/sales',
  asyncHandler(async (req, res) => {
    const { period = 'daily' } = req.query;
    const trunc = period === 'monthly' ? 'month' : period === 'weekly' ? 'week' : 'day';
    const { rows } = await pool.query(
      `SELECT date_trunc('${trunc}', created_at) AS period, SUM(total_amount) AS revenue, COUNT(*) AS transactions
       FROM transactions
       GROUP BY period ORDER BY period DESC LIMIT 30`
    );
    res.json(rows);
  })
);

router.get(
  '/top-services',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT sc.name, COUNT(t.id) AS times_sold, SUM(t.total_amount) AS revenue
       FROM transactions t JOIN service_catalog sc ON sc.id = t.service_id
       WHERE t.module = 'cyber_service'
       GROUP BY sc.name ORDER BY revenue DESC LIMIT 10`
    );
    res.json(rows);
  })
);

router.get(
  '/top-products',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT p.name, SUM(t.quantity) AS units_sold, SUM(t.total_amount) AS revenue
       FROM transactions t JOIN products p ON p.id = t.product_id
       WHERE t.module = 'product_sale'
       GROUP BY p.name ORDER BY revenue DESC LIMIT 10`
    );
    res.json(rows);
  })
);

router.get(
  '/debts',
  asyncHandler(async (req, res) => {
    const paid = await pool.query(`SELECT COALESCE(SUM(amount_paid),0) AS total FROM transactions`);
    const pending = await pool.query(`SELECT COALESCE(SUM(balance),0) AS total FROM transactions WHERE status != 'paid'`);
    res.json({ paid: paid.rows[0].total, pending: pending.rows[0].total });
  })
);

router.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const returning = await pool.query(
      `SELECT COUNT(*) FROM (
        SELECT customer_id FROM transactions GROUP BY customer_id HAVING COUNT(*) > 1
      ) sub`
    );
    const newCustomers = await pool.query(
      `SELECT COUNT(*) FROM customers WHERE created_at >= NOW() - INTERVAL '30 days'`
    );
    const total = await pool.query('SELECT COUNT(*) FROM customers');
    res.json({
      returning_customers: Number(returning.rows[0].count),
      new_customers_30d: Number(newCustomers.rows[0].count),
      total_customers: Number(total.rows[0].count),
    });
  })
);

router.get(
  '/expenses-profit',
  asyncHandler(async (req, res) => {
    const revenue = await pool.query(`SELECT COALESCE(SUM(amount_paid),0) AS total FROM transactions`);
    const expenses = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses`);
    const rev = Number(revenue.rows[0].total);
    const exp = Number(expenses.rows[0].total);
    res.json({ revenue: rev, expenses: exp, profit: rev - exp });
  })
);

export default router;
