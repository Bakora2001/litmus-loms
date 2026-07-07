import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const COST_PER_SMS = 1; // KES per SMS, adjust to your provider's rate

// Resolve a target audience into a list of customer phone numbers
async function resolveAudience(audience) {
  if (audience === 'debtors') {
    const { rows } = await pool.query(
      `SELECT DISTINCT c.phone FROM customers c
       JOIN transactions t ON t.customer_id = c.id
       WHERE t.status != 'paid'`
    );
    return rows.map((r) => r.phone);
  }
  if (audience === 'vip') {
    const { rows } = await pool.query('SELECT phone FROM customers WHERE is_vip = TRUE');
    return rows.map((r) => r.phone);
  }
  // 'customers' and 'everyone' both mean the full customer list for now
  const { rows } = await pool.query('SELECT phone FROM customers');
  return rows.map((r) => r.phone);
}

/**
 * Actually deliver an SMS via your provider's Sender ID API.
 * Fill in SMS_PROVIDER_API_URL / SMS_PROVIDER_API_KEY in .env to go live.
 * Until then this simulates delivery so the UI is fully testable end-to-end.
 */
async function deliverSms(recipient, message) {
  const { SMS_PROVIDER_API_URL, SMS_PROVIDER_API_KEY, SMS_SENDER_ID } = process.env;
  if (!SMS_PROVIDER_API_URL || !SMS_PROVIDER_API_KEY) {
    // Simulated success - swap this block for a real fetch() call to your provider
    return { success: true, simulated: true };
  }

  const response = await fetch(SMS_PROVIDER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SMS_PROVIDER_API_KEY}`,
    },
    body: JSON.stringify({ to: recipient, message, from: SMS_SENDER_ID }),
  });
  return { success: response.ok, simulated: false };
}

router.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM sms_campaigns ORDER BY created_at DESC');
    res.json(rows);
  })
);

router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 200');
    res.json(rows);
  })
);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const total = await pool.query(
      `SELECT COUNT(*) AS total_sent, COALESCE(SUM(cost),0) AS total_cost,
        COUNT(*) FILTER (WHERE status = 'failed') AS total_failed
       FROM sms_logs`
    );
    res.json(total.rows[0]);
  })
);

router.post(
  '/send',
  asyncHandler(async (req, res) => {
    const { message, audience = 'everyone', scheduled_for, created_by } = req.body;
    if (!message) return res.status(400).json({ message: 'Message text is required.' });

    const recipients = await resolveAudience(audience);

    const campaign = await pool.query(
      `INSERT INTO sms_campaigns (message, audience, scheduled_for, status, recipients_count, cost, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        message,
        audience,
        scheduled_for || null,
        scheduled_for ? 'scheduled' : 'sending',
        recipients.length,
        recipients.length * COST_PER_SMS,
        created_by || null,
      ]
    );

    // If not scheduled for later, send immediately
    if (!scheduled_for) {
      for (const phone of recipients) {
        const result = await deliverSms(phone, message);
        await pool.query(
          `INSERT INTO sms_logs (campaign_id, recipient, message, status, cost)
           VALUES ($1,$2,$3,$4,$5)`,
          [campaign.rows[0].id, phone, message, result.success ? 'sent' : 'failed', COST_PER_SMS]
        );
      }
      await pool.query(`UPDATE sms_campaigns SET status = 'sent' WHERE id = $1`, [campaign.rows[0].id]);
    }

    res.status(201).json(campaign.rows[0]);
  })
);

export default router;
