import { pool } from '../db.js';

async function alterTable() {
  try {
    console.log('▶ Altering table users to add permissions column...');
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{expenses,profits,inventory,invoices,sms,settings}';
    `);
    console.log('✅ Alteration complete. Permissions column is ready.');
  } catch (err) {
    console.error('❌ Alteration failed:', err.message);
  } finally {
    await pool.end();
  }
}

alterTable();
