const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@furryfriends.local';
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1', [email, username]);
  if (existing.rows.length > 0) {
    console.log('Admin already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (email, username, password_hash, role) VALUES ($1, $2, $3, $4)',
    [email.toLowerCase(), username, passwordHash, 'admin']
  );

  console.log('Seeded admin:', email, '/', username);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });