const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize, checkSectionAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/school/:schoolId', authenticate, checkSectionAccess('school'), async (req, res) => {
  try {
    const [classes] = await pool.query(`
      SELECT c.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
      FROM classes c LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.school_id = ? AND c.is_active = true ORDER BY c.grade, c.section
    `, [req.params.schoolId]);
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [classes] = await pool.query(`
      SELECT c.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name, s.name as school_name
      FROM classes c LEFT JOIN users u ON c.teacher_id = u.id LEFT JOIN schools s ON c.school_id = s.id
      WHERE c.id = ?
    `, [req.params.id]);
    if (classes.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(classes[0]);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

router.post('/', authenticate, authorize('developer', 'owner', 'school_teacher'), checkSectionAccess('school'), async (req, res) => {
  try {
    const { school_id, name, grade, section, room_number, teacher_id, academic_year } = req.body;
    if (!school_id || !name) {
      return res.status(400).json({ error: 'School ID and class name are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO classes (school_id, name, grade, section, room_number, teacher_id, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [school_id, name, grade, section, room_number, teacher_id, academic_year]
    );
    const [newClass] = await pool.query('SELECT * FROM classes WHERE id = ?', [result.insertId]);
    res.status(201).json(newClass[0]);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

router.put('/:id', authenticate, authorize('developer', 'owner', 'school_teacher'), async (req, res) => {
  try {
    const { name, grade, section, room_number, teacher_id, academic_year, is_active } = req.body;
    await pool.query(
      'UPDATE classes SET name = ?, grade = ?, section = ?, room_number = ?, teacher_id = ?, academic_year = ?, is_active = ? WHERE id = ?',
      [name, grade, section, room_number, teacher_id, academic_year, is_active, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM classes WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner', 'school_teacher'), async (req, res) => {
  try {
    await pool.query('UPDATE classes SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

module.exports = router;
