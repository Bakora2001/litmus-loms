import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const todayRevenue = await pool.query(
      `SELECT COALESCE(SUM(amount_paid),0) AS total FROM transactions WHERE created_at::date = CURRENT_DATE`
    );
    const yesterdayRevenue = await pool.query(
      `SELECT COALESCE(SUM(amount_paid),0) AS total FROM transactions WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'`
    );
    const outstandingDebts = await pool.query(
      `SELECT COALESCE(SUM(balance),0) AS total, COUNT(DISTINCT customer_id) AS customers
       FROM transactions WHERE status != 'paid'`
    );
    const pendingTasks = await pool.query(
      `SELECT COUNT(*) FROM tasks WHERE status NOT IN ('completed','cancelled')`
    );
    const highPriorityTasks = await pool.query(
      `SELECT COUNT(*) FROM tasks WHERE priority IN ('high','critical') AND status NOT IN ('completed','cancelled')`
    );
    const completedTasks = await pool.query(
      `SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND updated_at::date = CURRENT_DATE`
    );
    const todaysCustomers = await pool.query(
      `SELECT COUNT(DISTINCT customer_id) FROM transactions WHERE created_at::date = CURRENT_DATE`
    );
    const lowStock = await pool.query(
      `SELECT COUNT(*) FROM products WHERE quantity <= min_stock AND is_active = TRUE`
    );

    res.json({
      todays_revenue: Number(todayRevenue.rows[0].total),
      yesterday_revenue: Number(yesterdayRevenue.rows[0].total),
      outstanding_debts: Number(outstandingDebts.rows[0].total),
      debtor_customers: Number(outstandingDebts.rows[0].customers),
      pending_tasks: Number(pendingTasks.rows[0].count),
      high_priority_tasks: Number(highPriorityTasks.rows[0].count),
      completed_tasks_today: Number(completedTasks.rows[0].count),
      todays_customers: Number(todaysCustomers.rows[0].count),
      low_stock_items: Number(lowStock.rows[0].count),
    });
  })
);

router.get(
  '/revenue-overview',
  asyncHandler(async (req, res) => {
    const thisMonth = await pool.query(
      `SELECT created_at::date AS day, SUM(amount_paid) AS revenue
       FROM transactions
       WHERE created_at >= date_trunc('month', CURRENT_DATE)
       GROUP BY day ORDER BY day`
    );
    const lastMonth = await pool.query(
      `SELECT created_at::date AS day, SUM(amount_paid) AS revenue
       FROM transactions
       WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
         AND created_at < date_trunc('month', CURRENT_DATE)
       GROUP BY day ORDER BY day`
    );
    res.json({ this_month: thisMonth.rows, last_month: lastMonth.rows });
  })
);

router.get(
  '/top-services',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT sc.name, COUNT(t.id) AS count
       FROM transactions t JOIN service_catalog sc ON sc.id = t.service_id
       WHERE t.module = 'cyber_service' AND t.created_at >= date_trunc('month', CURRENT_DATE)
       GROUP BY sc.name ORDER BY count DESC LIMIT 5`
    );
    res.json(rows);
  })
);

router.get(
  '/top-products',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT p.name, SUM(t.quantity) AS units, SUM(t.total_amount) AS revenue
       FROM transactions t JOIN products p ON p.id = t.product_id
       WHERE t.module = 'product_sale' AND t.created_at >= date_trunc('month', CURRENT_DATE)
       GROUP BY p.name ORDER BY revenue DESC LIMIT 5`
    );
    res.json(rows);
  })
);

router.get(
  '/upcoming-deadlines',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, title, deadline, priority FROM tasks
       WHERE deadline >= NOW() AND status NOT IN ('completed','cancelled')
       ORDER BY deadline ASC LIMIT 5`
    );
    res.json(rows);
  })
);

router.get(
  '/recent-invoices',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT i.id, i.invoice_number, i.total, i.status, c.name AS customer_name
       FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
       ORDER BY i.created_at DESC LIMIT 5`
    );
    res.json(rows);
  })
);

router.get(
  '/recent-transactions',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.id, t.description, t.total_amount, t.module, t.created_at
       FROM transactions t ORDER BY t.created_at DESC LIMIT 6`
    );
    res.json(rows);
  })
);

router.get(
  '/low-stock',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, name, quantity, min_stock FROM products
       WHERE quantity <= min_stock AND is_active = TRUE ORDER BY quantity ASC LIMIT 6`
    );
    res.json(rows);
  })
);

router.get(
  '/sms-summary',
  asyncHandler(async (req, res) => {
    const settings = await pool.query('SELECT * FROM settings WHERE id = 1');
    const used = await pool.query(
      `SELECT COUNT(*) FROM sms_logs WHERE sent_at >= date_trunc('month', CURRENT_DATE)`
    );
    res.json({
      total_credits: 32000,
      used_credits: Number(used.rows[0].count),
      remaining: 32000 - Number(used.rows[0].count),
    });
  })
);

router.get(
  '/recent-activities',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `(SELECT 'task' AS type, title AS label, created_at FROM tasks ORDER BY created_at DESC LIMIT 5)
       UNION ALL
       (SELECT 'invoice' AS type, invoice_number AS label, created_at FROM invoices ORDER BY created_at DESC LIMIT 5)
       UNION ALL
       (SELECT 'payment' AS type, description AS label, created_at FROM transactions ORDER BY created_at DESC LIMIT 5)
       ORDER BY created_at DESC LIMIT 8`
    );
    res.json(rows);
  })
);

export default router;
