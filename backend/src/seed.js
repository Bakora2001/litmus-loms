import bcrypt from 'bcryptjs';
import { pool } from './db.js';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('▶ Seeding default admin user...');
    const passwordHash = await bcrypt.hash('Litmus@2026', 10);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'owner')
       ON CONFLICT (email) DO NOTHING`,
      ['Admin Denism Babu', 'admin@litmussolutions.co.ke', passwordHash]
    );

    console.log('▶ Seeding a couple of demo customers...');
    await client.query(
      `INSERT INTO customers (phone, name, business_name)
       VALUES
        ('0722000111','James Mwangi', NULL),
        ('0733000222','Mary Wanjiku','Best Solutions Ltd')
       ON CONFLICT (phone) DO NOTHING`
    );

    console.log('✅ Seed complete.');
    console.log('   Login with: admin@litmussolutions.co.ke / Litmus@2026');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
