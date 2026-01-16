const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.email = ? AND u.is_active = true
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const [assignments] = await pool.query(`
      SELECT ua.*, s.name as school_name, c.name as center_name
      FROM user_assignments ua
      LEFT JOIN schools s ON ua.school_id = s.id
      LEFT JOIN centers c ON ua.center_id = c.id
      WHERE ua.user_id = ?
    `, [user.id]);

    const token = jwt.sign(
      { userId: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    delete user.password;

    res.json({
      token,
      user: { ...user, assignments }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const [assignments] = await pool.query(`
      SELECT ua.*, s.name as school_name, c.name as center_name
      FROM user_assignments ua
      LEFT JOIN schools s ON ua.school_id = s.id
      LEFT JOIN centers c ON ua.center_id = c.id
      WHERE ua.user_id = ?
    `, [req.user.id]);

    const user = { ...req.user };
    delete user.password;
    res.json({ ...user, assignments });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
