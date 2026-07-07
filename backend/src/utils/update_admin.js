import { pool } from '../db.js';

async function updateAdmin() {
  try {
    console.log('▶ Updating admin user name in the database to Admin Denism Babu...');
    const res = await pool.query(
      `UPDATE users
       SET name = 'Admin Denism Babu', role = 'owner'
       WHERE email = 'admin@litmussolutions.co.ke'
       RETURNING id, name, role`
    );
    if (res.rows.length) {
      console.log('✅ Admin user updated successfully:', res.rows[0]);
    } else {
      console.log('⚠️ Admin user with email admin@litmussolutions.co.ke not found.');
    }
  } catch (err) {
    console.error('❌ Update failed:', err.message);
  } finally {
    await pool.end();
  }
}

updateAdmin();
