const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [assignments] = await pool.query(`
      SELECT ta.*, u.first_name as staff_first_name, u.last_name as staff_last_name, 
             u.email as staff_email, r.name as staff_role_name,
             s.name as school_name, c.name as center_name, 
             ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name 
      FROM trainer_assignments ta 
      JOIN users u ON ta.trainer_id = u.id 
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN schools s ON ta.school_id = s.id 
      LEFT JOIN centers c ON ta.center_id = c.id 
      LEFT JOIN users ab ON ta.assigned_by = ab.id 
      WHERE ta.is_active = true 
      ORDER BY u.first_name, s.name, c.name
    `);
    
    // Rename fields for frontend compatibility
    const formattedAssignments = assignments.map(a => ({
      ...a,
      staff_id: a.trainer_id,
      role_name: a.staff_role_name
    }));
    
    res.json(formattedAssignments);
  } catch (error) {
    console.error('Get staff assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch staff assignments' });
  }
});

router.get('/staff', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [staff] = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name IN ('trainer', 'registrar') AND u.is_active = true 
      ORDER BY u.first_name
    `);
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

router.get('/staff/:staffId', authenticate, async (req, res) => {
  try {
    const [assignments] = await pool.query(`
      SELECT ta.*, s.name as school_name, c.name as center_name 
      FROM trainer_assignments ta 
      LEFT JOIN schools s ON ta.school_id = s.id 
      LEFT JOIN centers c ON ta.center_id = c.id 
      WHERE ta.trainer_id = ? AND ta.is_active = true
    `, [req.params.staffId]);
    res.json(assignments);
  } catch (error) {
    console.error('Get staff assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.get('/my-schools', authenticate, async (req, res) => {
  try {
    const [schools] = await pool.query(`
      SELECT DISTINCT s.* 
      FROM schools s 
      JOIN trainer_assignments ta ON ta.school_id = s.id 
      WHERE ta.trainer_id = ? AND ta.is_active = true AND s.is_active = true
    `, [req.user.id]);
    res.json(schools);
  } catch (error) {
    console.error('Get my schools error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

router.get('/my-centers', authenticate, async (req, res) => {
  try {
    const [centers] = await pool.query(`
      SELECT DISTINCT c.* 
      FROM centers c 
      JOIN trainer_assignments ta ON ta.center_id = c.id 
      WHERE ta.trainer_id = ? AND ta.is_active = true AND c.is_active = true
    `, [req.user.id]);
    res.json(centers);
  } catch (error) {
    console.error('Get my centers error:', error);
    res.status(500).json({ error: 'Failed to fetch centers' });
  }
});

router.post('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const { staff_id, school_id, center_id } = req.body;
    
    if (!staff_id || (!school_id && !center_id)) {
      return res.status(400).json({ error: 'Staff ID and either school or center ID required' });
    }

    // Check if staff member is a registrar
    const [staffCheck] = await pool.query(`
      SELECT r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `, [staff_id]);

    if (staffCheck.length === 0) {
      return res.status(400).json({ error: 'Staff member not found' });
    }

    const isRegistrar = staffCheck[0].role_name === 'registrar';

    // Registrars can only be assigned to centers
    if (isRegistrar && school_id) {
      return res.status(400).json({ error: 'Registrars can only be assigned to centers' });
    }

    // Check for existing assignment
    let checkQuery = 'SELECT id FROM trainer_assignments WHERE trainer_id = ? AND is_active = true AND ';
    const checkParams = [staff_id];
    
    if (school_id) { 
      checkQuery += 'school_id = ?'; 
      checkParams.push(school_id); 
    } else { 
      checkQuery += 'center_id = ?'; 
      checkParams.push(center_id); 
    }
    
    const [existing] = await pool.query(checkQuery, checkParams);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This assignment already exists' });
    }

    const [result] = await pool.query(`
      INSERT INTO trainer_assignments (trainer_id, school_id, center_id, assigned_by) 
      VALUES (?, ?, ?, ?)
    `, [staff_id, school_id || null, center_id || null, req.user.id]);

    const [newAssignment] = await pool.query(`
      SELECT ta.*, u.first_name as staff_first_name, u.last_name as staff_last_name, 
             s.name as school_name, c.name as center_name 
      FROM trainer_assignments ta 
      JOIN users u ON ta.trainer_id = u.id 
      LEFT JOIN schools s ON ta.school_id = s.id 
      LEFT JOIN centers c ON ta.center_id = c.id 
      WHERE ta.id = ?
    `, [result.insertId]);

    res.status(201).json(newAssignment[0]);
  } catch (error) {
    console.error('Create staff assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE trainer_assignments SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('Delete staff assignment error:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

module.exports = router;
