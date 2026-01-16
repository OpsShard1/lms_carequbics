const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [assignments] = await pool.query(`SELECT ta.*, u.first_name as trainer_first_name, u.last_name as trainer_last_name, u.email as trainer_email, s.name as school_name, c.name as center_name, ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name FROM trainer_assignments ta JOIN users u ON ta.trainer_id = u.id LEFT JOIN schools s ON ta.school_id = s.id LEFT JOIN centers c ON ta.center_id = c.id LEFT JOIN users ab ON ta.assigned_by = ab.id WHERE ta.is_active = true ORDER BY u.first_name, s.name, c.name`);
    res.json(assignments);
  } catch (error) {
    console.error('Get trainer assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch trainer assignments' });
  }
});

router.get('/trainers', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [trainers] = await pool.query(`SELECT u.id, u.first_name, u.last_name, u.email FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'trainer' AND u.is_active = true ORDER BY u.first_name`);
    res.json(trainers);
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

router.get('/trainer/:trainerId', authenticate, async (req, res) => {
  try {
    const [assignments] = await pool.query(`SELECT ta.*, s.name as school_name, c.name as center_name FROM trainer_assignments ta LEFT JOIN schools s ON ta.school_id = s.id LEFT JOIN centers c ON ta.center_id = c.id WHERE ta.trainer_id = ? AND ta.is_active = true`, [req.params.trainerId]);
    res.json(assignments);
  } catch (error) {
    console.error('Get trainer assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.get('/my-schools', authenticate, async (req, res) => {
  try {
    const [schools] = await pool.query(`SELECT DISTINCT s.* FROM schools s JOIN trainer_assignments ta ON ta.school_id = s.id WHERE ta.trainer_id = ? AND ta.is_active = true AND s.is_active = true`, [req.user.id]);
    res.json(schools);
  } catch (error) {
    console.error('Get my schools error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

router.get('/my-centers', authenticate, async (req, res) => {
  try {
    const [centers] = await pool.query(`SELECT DISTINCT c.* FROM centers c JOIN trainer_assignments ta ON ta.center_id = c.id WHERE ta.trainer_id = ? AND ta.is_active = true AND c.is_active = true`, [req.user.id]);
    res.json(centers);
  } catch (error) {
    console.error('Get my centers error:', error);
    res.status(500).json({ error: 'Failed to fetch centers' });
  }
});

router.post('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const { trainer_id, school_id, center_id } = req.body;
    if (!trainer_id || (!school_id && !center_id)) {
      return res.status(400).json({ error: 'Trainer ID and either school or center ID required' });
    }
    let checkQuery = 'SELECT id FROM trainer_assignments WHERE trainer_id = ? AND is_active = true AND ';
    const checkParams = [trainer_id];
    if (school_id) { checkQuery += 'school_id = ?'; checkParams.push(school_id); }
    else { checkQuery += 'center_id = ?'; checkParams.push(center_id); }
    const [existing] = await pool.query(checkQuery, checkParams);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This assignment already exists' });
    }
    const [result] = await pool.query(`INSERT INTO trainer_assignments (trainer_id, school_id, center_id, assigned_by) VALUES (?, ?, ?, ?)`, [trainer_id, school_id || null, center_id || null, req.user.id]);
    const [newAssignment] = await pool.query(`SELECT ta.*, u.first_name as trainer_first_name, u.last_name as trainer_last_name, s.name as school_name, c.name as center_name FROM trainer_assignments ta JOIN users u ON ta.trainer_id = u.id LEFT JOIN schools s ON ta.school_id = s.id LEFT JOIN centers c ON ta.center_id = c.id WHERE ta.id = ?`, [result.insertId]);
    res.status(201).json(newAssignment[0]);
  } catch (error) {
    console.error('Create trainer assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE trainer_assignments SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('Delete trainer assignment error:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

module.exports = router;
