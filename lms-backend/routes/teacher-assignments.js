const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [assignments] = await pool.query(`SELECT ua.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name, u.email as teacher_email, s.name as school_name FROM user_assignments ua JOIN users u ON ua.user_id = u.id JOIN roles r ON u.role_id = r.id LEFT JOIN schools s ON ua.school_id = s.id WHERE r.name = 'school_teacher' AND ua.school_id IS NOT NULL ORDER BY u.first_name, s.name`);
    res.json(assignments);
  } catch (error) {
    console.error('Get teacher assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher assignments' });
  }
});

router.get('/teachers', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const [teachers] = await pool.query(`SELECT u.id, u.first_name, u.last_name, u.email FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'school_teacher' AND u.is_active = true ORDER BY u.first_name`);
    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

router.get('/my-schools', authenticate, async (req, res) => {
  try {
    const [schools] = await pool.query(`SELECT DISTINCT s.* FROM schools s JOIN user_assignments ua ON ua.school_id = s.id WHERE ua.user_id = ? AND s.is_active = true`, [req.user.id]);
    res.json(schools);
  } catch (error) {
    console.error('Get my schools error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

router.post('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const { teacher_id, school_id } = req.body;
    if (!teacher_id || !school_id) {
      return res.status(400).json({ error: 'Teacher ID and school ID are required' });
    }
    const [existing] = await pool.query('SELECT id FROM user_assignments WHERE user_id = ? AND school_id = ?', [teacher_id, school_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This assignment already exists' });
    }
    const [result] = await pool.query(`INSERT INTO user_assignments (user_id, school_id, is_primary) VALUES (?, ?, false)`, [teacher_id, school_id]);
    const [newAssignment] = await pool.query(`SELECT ua.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name, s.name as school_name FROM user_assignments ua JOIN users u ON ua.user_id = u.id LEFT JOIN schools s ON ua.school_id = s.id WHERE ua.id = ?`, [result.insertId]);
    res.status(201).json(newAssignment[0]);
  } catch (error) {
    console.error('Create teacher assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('DELETE FROM user_assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('Delete teacher assignment error:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

module.exports = router;
