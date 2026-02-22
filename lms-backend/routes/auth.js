const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get a connection from the pool
    connection = await pool.getConnection();

    // First check if user exists (regardless of active status)
    const [allUsers] = await connection.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.email = ?
    `, [email]);

    if (allUsers.length === 0) {
      connection.release();
      return res.status(401).json({ error: 'Wrong email or password' });
    }

    const user = allUsers[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      connection.release();
      return res.status(401).json({ error: 'Wrong email or password' });
    }

    // Check if user is deactivated
    if (!user.is_active) {
      connection.release();
      return res.status(403).json({ 
        error: 'Account Deactivated',
        message: 'Your account has been deactivated. Please contact your administrator for assistance.',
        isDeactivated: true
      });
    }

    const [assignments] = await connection.query(`
      SELECT ua.*, s.name as school_name, c.name as center_name
      FROM user_assignments ua
      LEFT JOIN schools s ON ua.school_id = s.id
      LEFT JOIN centers c ON ua.center_id = c.id
      WHERE ua.user_id = ?
    `, [user.id]);

    // Release connection back to pool
    connection.release();

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
    // Release connection if it was acquired
    if (connection) {
      connection.release();
    }
    
    console.error('Login error:', error);
    
    // Provide more specific error messages
    if (error.code === 'ECONNRESET') {
      return res.status(503).json({ 
        error: 'Database connection lost', 
        message: 'Unable to connect to the database. Please try again.',
        details: 'The connection to the database was reset. This may be due to network issues or server timeout.'
      });
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Database unavailable', 
        message: 'Cannot reach the database server. Please try again later.',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Login failed', 
      message: 'An unexpected error occurred during login.',
      details: error.message 
    });
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

// Validate token
router.get('/validate', authenticate, async (req, res) => {
  try {
    // If authenticate middleware passes, token is valid
    res.json({ valid: true, userId: req.user.id });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
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
