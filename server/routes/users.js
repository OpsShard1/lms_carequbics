import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all users
router.get('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.section_type, 
             u.is_active, u.created_at, r.name as role_name, r.id as role_id
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all roles
router.get('/roles', authenticate, async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.section_type, 
             u.is_active, u.created_at, r.name as role_name, r.id as role_id
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `, [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get assignments
    const [assignments] = await pool.query(`
      SELECT ua.*, s.name as school_name, c.name as center_name
      FROM user_assignments ua
      LEFT JOIN schools s ON ua.school_id = s.id
      LEFT JOIN centers c ON ua.center_id = c.id
      WHERE ua.user_id = ?
    `, [req.params.id]);

    res.json({ ...users[0], assignments });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
router.post('/', authenticate, authorize('developer', 'owner'), async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, role_id, section_type, assignments } = req.body;

    if (!email || !password || !first_name || !role_id) {
      return res.status(400).json({ error: 'Email, password, first name, and role are required' });
    }

    // Check if email exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, phone, role_id, section_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, first_name, last_name, phone, role_id, section_type || 'school']
    );

    // Add assignments if provided
    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        await pool.query(
          'INSERT INTO user_assignments (user_id, school_id, center_id, is_primary) VALUES (?, ?, ?, ?)',
          [result.insertId, assignment.school_id || null, assignment.center_id || null, assignment.is_primary || false]
        );
      }
    }

    const [newUser] = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.section_type, 
             u.is_active, u.created_at, r.name as role_name
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `, [result.insertId]);

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticate, authorize('developer', 'owner'), async (req, res) => {
  try {
    const { email, first_name, last_name, phone, role_id, section_type, is_active, assignments } = req.body;

    await pool.query(
      'UPDATE users SET email = ?, first_name = ?, last_name = ?, phone = ?, role_id = ?, section_type = ?, is_active = ? WHERE id = ?',
      [email, first_name, last_name, phone, role_id, section_type, is_active, req.params.id]
    );

    // Update assignments if provided
    if (assignments) {
      await pool.query('DELETE FROM user_assignments WHERE user_id = ?', [req.params.id]);
      for (const assignment of assignments) {
        await pool.query(
          'INSERT INTO user_assignments (user_id, school_id, center_id, is_primary) VALUES (?, ?, ?, ?)',
          [req.params.id, assignment.school_id || null, assignment.center_id || null, assignment.is_primary || false]
        );
      }
    }

    const [updated] = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.section_type, 
             u.is_active, u.created_at, r.name as role_name
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `, [req.params.id]);

    res.json(updated[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (soft delete)
router.delete('/:id', authenticate, authorize('developer', 'owner'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
