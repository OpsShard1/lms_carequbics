const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all schools with their assigned teachers, principals, and sales
router.get('/', authenticate, authorize('developer', 'owner', 'trainer_head', 'sales_head'), async (req, res) => {
  try {
    // Get all schools
    const [schools] = await pool.query(`
      SELECT * FROM schools WHERE is_active = true ORDER BY name
    `);

    // Get all assignments for schools
    const [assignments] = await pool.query(`
      SELECT 
        ua.id,
        ua.user_id,
        ua.school_id,
        u.first_name,
        u.last_name,
        u.email,
        r.name as role_name
      FROM user_assignments ua
      JOIN users u ON ua.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE ua.school_id IS NOT NULL 
        AND (r.name = 'school_teacher' OR r.name LIKE '%principal%' OR r.name = 'sales')
        AND u.is_active = true
      ORDER BY r.name, u.first_name
    `);

    // Group assignments by school
    const schoolsWithAssignments = schools.map(school => ({
      ...school,
      teachers: assignments.filter(a => a.school_id === school.id && a.role_name === 'school_teacher'),
      principals: assignments.filter(a => a.school_id === school.id && a.role_name.includes('principal')),
      sales: assignments.filter(a => a.school_id === school.id && a.role_name === 'sales')
    }));

    res.json(schoolsWithAssignments);
  } catch (error) {
    console.error('Get school assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch school assignments' });
  }
});

// Get available teachers (not assigned to a specific school)
router.get('/available-teachers', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [teachers] = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'school_teacher' AND u.is_active = true 
      ORDER BY u.first_name
    `);
    res.json(teachers);
  } catch (error) {
    console.error('Get available teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Get available principals (not assigned to a specific school)
router.get('/available-principals', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [principals] = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, r.name as role_name
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name LIKE '%principal%' AND u.is_active = true 
      ORDER BY u.first_name
    `);
    res.json(principals);
  } catch (error) {
    console.error('Get available principals error:', error);
    res.status(500).json({ error: 'Failed to fetch principals' });
  }
});

// Get available sales users
router.get('/available-sales', authenticate, authorize('developer', 'owner', 'trainer_head', 'sales_head'), async (req, res) => {
  try {
    const [salesUsers] = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'sales' AND u.is_active = true 
      ORDER BY u.first_name
    `);
    res.json(salesUsers);
  } catch (error) {
    console.error('Get available sales users error:', error);
    res.status(500).json({ error: 'Failed to fetch sales users' });
  }
});

// Assign a user (teacher, principal, or sales) to a school
router.post('/', authenticate, authorize('developer', 'owner', 'trainer_head', 'sales_head'), async (req, res) => {
  try {
    const { user_id, school_id } = req.body;
    
    if (!user_id || !school_id) {
      return res.status(400).json({ error: 'User ID and school ID are required' });
    }

    // Check if assignment already exists
    const [existing] = await pool.query(
      'SELECT id FROM user_assignments WHERE user_id = ? AND school_id = ?',
      [user_id, school_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'This assignment already exists' });
    }

    // Create assignment
    await pool.query(
      'INSERT INTO user_assignments (user_id, school_id, is_primary) VALUES (?, ?, false)',
      [user_id, school_id]
    );

    res.status(201).json({ message: 'Assignment created successfully' });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Remove an assignment
router.delete('/:id', authenticate, authorize('developer', 'owner', 'trainer_head', 'sales_head'), async (req, res) => {
  try {
    await pool.query('DELETE FROM user_assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

module.exports = router;
