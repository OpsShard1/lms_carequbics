const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.section_type, 
             u.is_active, u.created_at, r.name as role_name, r.id as role_id
      FROM users u JOIN roles r ON u.role_id = r.id 
      WHERE r.name != 'super_admin'
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/roles', authenticate, async (req, res) => {
  try {
    const [roles] = await pool.query("SELECT * FROM roles WHERE name != 'parent' AND name != 'super_admin' ORDER BY id");
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.section_type, 
             u.is_active, u.created_at, r.name as role_name, r.id as role_id
      FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?
    `, [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
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

router.post('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, role_id, section_type, assignments } = req.body;
    if (!email || !password || !first_name || !role_id) {
      return res.status(400).json({ error: 'Email, password, first name, and role are required' });
    }
    
    // Check role restrictions for trainer_head
    if (req.user.role_name === 'trainer_head') {
      const [roleCheck] = await pool.query('SELECT name FROM roles WHERE id = ?', [role_id]);
      if (roleCheck.length === 0) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      const roleName = roleCheck[0].name;
      // trainer_head can only create school_teacher and trainer users
      if (!['school_teacher', 'trainer'].includes(roleName)) {
        return res.status(403).json({ error: 'You can only create school_teacher and trainer accounts' });
      }
    }
    
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, phone, role_id, section_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, first_name, last_name, phone, role_id, section_type || 'school']
    );
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
      FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?
    `, [result.insertId]);
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', authenticate, authorize('developer', 'owner', 'super_admin', 'trainer_head'), async (req, res) => {
  try {
    const { email, first_name, last_name, phone, role_id, section_type, is_active, password, assignments } = req.body;
    
    // Check role restrictions for trainer_head
    if (req.user.role_name === 'trainer_head') {
      // Get the current user's role
      const [currentUser] = await pool.query('SELECT u.role_id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [req.params.id]);
      if (currentUser.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // trainer_head can only edit school_teacher and trainer users
      if (!['school_teacher', 'trainer'].includes(currentUser[0].role_name)) {
        return res.status(403).json({ error: 'You can only edit school_teacher and trainer accounts' });
      }
      
      // If changing role, check the new role
      if (role_id && role_id !== currentUser[0].role_id) {
        const [newRoleCheck] = await pool.query('SELECT name FROM roles WHERE id = ?', [role_id]);
        if (newRoleCheck.length === 0 || !['school_teacher', 'trainer'].includes(newRoleCheck[0].name)) {
          return res.status(403).json({ error: 'You can only assign school_teacher and trainer roles' });
        }
      }
    }
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (role_id !== undefined) {
      updates.push('role_id = ?');
      values.push(role_id);
    }
    if (section_type !== undefined) {
      updates.push('section_type = ?');
      values.push(section_type);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (password && password.trim() !== '') {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    
    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
    
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
      FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?
    `, [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner', 'super_admin', 'trainer_head'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Check role restrictions for trainer_head
    if (req.user.role_name === 'trainer_head') {
      const [userToDelete] = await connection.query('SELECT u.role_id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [req.params.id]);
      if (userToDelete.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'User not found' });
      }
      
      // trainer_head can only delete school_teacher and trainer users
      if (!['school_teacher', 'trainer'].includes(userToDelete[0].role_name)) {
        await connection.rollback();
        connection.release();
        return res.status(403).json({ error: 'You can only delete school_teacher and trainer accounts' });
      }
    }
    
    // Get user data before deletion
    const [userData] = await connection.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `, [req.params.id]);
    
    if (userData.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userData[0];
    
    // Insert into deleted_users table
    await connection.query(`
      INSERT INTO deleted_users 
      (id, email, password, first_name, last_name, phone, role_id, role_name, section_type, is_active, created_at, deleted_at, deleted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `, [
      user.id,
      user.email,
      user.password,
      user.first_name,
      user.last_name,
      user.phone,
      user.role_id,
      user.role_name,
      user.section_type,
      user.is_active,
      user.created_at,
      req.user.id
    ]);
    
    // Delete from user_assignments first (foreign key constraint)
    await connection.query('DELETE FROM user_assignments WHERE user_id = ?', [req.params.id]);
    
    // Delete from users table
    await connection.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    
    await connection.commit();
    connection.release();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
