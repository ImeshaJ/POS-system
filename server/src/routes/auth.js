const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function isEmail(value) {
  return /.+@.+\..+/.test(value);
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, message: 'Email, username, and password are required' });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const normalizedRole = role || 'staff';
    if (!['admin', 'staff'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
      [email.toLowerCase(), username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role, created_at',
      [email.toLowerCase(), username, passwordHash, normalizedRole]
    );

    const user = result.rows[0];
    return res.status(201).json({ success: true, user });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    const result = await pool.query(
      'SELECT id, email, username, password_hash, role FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1',
      [identifier.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (role && role !== user.role) {
      return res.status(403).json({ success: false, message: 'Role mismatch' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    const result = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email.toLowerCase()]);

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    return next(error);
  }
});

router.get('/google', (_req, res) => {
  return res.status(501).json({ success: false, message: 'Google OAuth not implemented yet' });
});

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', verifyToken, async (req, res, next) => {
  try {
    const { email, username } = req.body;

    if (!email && !username) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (email) {
      if (!isEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      const duplicateEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1',
        [email.toLowerCase(), req.user.id]
      );

      if (duplicateEmail.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }

      updates.push(`email = $${idx}`);
      values.push(email.toLowerCase());
      idx += 1;
    }

    if (username) {
      const duplicateUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id <> $2 LIMIT 1',
        [username, req.user.id]
      );

      if (duplicateUsername.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Username already in use' });
      }

      updates.push(`username = $${idx}`);
      values.push(username);
      idx += 1;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, username, role, created_at, updated_at`,
      values
    );

    return res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
