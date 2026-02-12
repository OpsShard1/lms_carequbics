const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/school/:schoolId', authenticate, async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT s.*, c.name as class_name, c.grade, c.section
      FROM students s LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.school_id = ? AND s.student_type = 'school' AND s.is_active = true ORDER BY s.first_name
    `, [req.params.schoolId]);
    res.json(students);
  } catch (error) {
    console.error('Get school students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.get('/center/:centerId', authenticate, async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT s.*, c.name as curriculum_name, DATE_FORMAT(s.date_of_birth, '%Y-%m-%d') as date_of_birth
      FROM students s LEFT JOIN curriculums c ON s.curriculum_id = c.id
      WHERE s.center_id = ? AND s.student_type = 'center' AND s.is_active = true ORDER BY s.first_name
    `, [req.params.centerId]);
    res.json(students);
  } catch (error) {
    console.error('Get center students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.class_id = ? AND s.is_active = true ORDER BY s.is_extra ASC, s.first_name
    `, [req.params.classId]);
    res.json(students);
  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT s.*, c.name as class_name, sc.name as school_name, ct.name as center_name, cur.name as curriculum_name
      FROM students s LEFT JOIN classes c ON s.class_id = c.id LEFT JOIN schools sc ON s.school_id = sc.id
      LEFT JOIN centers ct ON s.center_id = ct.id LEFT JOIN curriculums cur ON s.curriculum_id = cur.id
      WHERE s.id = ?
    `, [req.params.id]);
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(students[0]);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

router.post('/school', authenticate, authorize('developer', 'school_teacher'), async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, age, gender, school_id, class_id, parent_name, parent_contact, parent_email, parent_address, enrollment_date } = req.body;
    if (!first_name || !date_of_birth || !school_id) {
      return res.status(400).json({ error: 'First name, date of birth, and school are required' });
    }
    const classIdValue = class_id && class_id !== '' ? class_id : null;
    const ageValue = age && age !== '' ? age : null;
    const genderValue = gender && gender !== '' ? gender : null;
    // Use provided enrollment_date or default to current date
    const enrollmentDate = enrollment_date || new Date().toISOString().split('T')[0];
    const [result] = await pool.query(`
      INSERT INTO students (first_name, last_name, date_of_birth, age, gender, student_type, school_id, class_id, parent_name, parent_contact, parent_email, parent_address, enrollment_date, is_extra, added_by)
      VALUES (?, ?, ?, ?, ?, 'school', ?, ?, ?, ?, ?, ?, ?, false, ?)
    `, [first_name, last_name || null, date_of_birth, ageValue, genderValue, school_id, classIdValue, parent_name || null, parent_contact || null, parent_email || null, parent_address || null, enrollmentDate, req.user.id]);
    const [newStudent] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json(newStudent[0]);
  } catch (error) {
    console.error('Create school student error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

router.post('/school/extra', authenticate, authorize('developer', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, age, gender, school_id, class_id, parent_name, parent_contact } = req.body;
    if (!first_name || !date_of_birth || !school_id || !class_id) {
      return res.status(400).json({ error: 'First name, date of birth, school, and class are required' });
    }
    const ageValue = age && age !== '' ? age : null;
    const genderValue = gender && gender !== '' ? gender : null;
    const [result] = await pool.query(`
      INSERT INTO students (first_name, last_name, date_of_birth, age, gender, student_type, school_id, class_id, parent_name, parent_contact, is_extra, added_by, enrollment_date)
      VALUES (?, ?, ?, ?, ?, 'school', ?, ?, ?, ?, true, ?, CURDATE())
    `, [first_name, last_name || null, date_of_birth, ageValue, genderValue, school_id, class_id, parent_name || null, parent_contact || null, req.user.id]);
    const [newStudent] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json(newStudent[0]);
  } catch (error) {
    console.error('Create extra student error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

router.post('/center', authenticate, authorize('developer', 'trainer', 'trainer_head', 'registrar'), async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, age, gender, center_id, school_name_external, student_class, curriculum_id, parent_name, parent_contact, parent_alternate_contact, parent_email, parent_address, parent_qualification, parent_occupation, referral_source, program_type, attended_before, class_format, enrollment_date, special_remarks } = req.body;
    if (!first_name || !date_of_birth || !center_id) {
      return res.status(400).json({ error: 'First name, date of birth, and center are required' });
    }
    const curriculumIdValue = curriculum_id && curriculum_id !== '' ? curriculum_id : null;
    const ageValue = age && age !== '' ? age : null;
    const genderValue = gender && gender !== '' ? gender : null;
    // Use provided enrollment_date or default to current date
    const enrollmentDate = enrollment_date || new Date().toISOString().split('T')[0];
    const [result] = await pool.query(`
      INSERT INTO students (first_name, last_name, date_of_birth, age, gender, student_type, center_id, school_name_external, student_class, curriculum_id, parent_name, parent_contact, parent_alternate_contact, parent_email, parent_address, parent_qualification, parent_occupation, referral_source, program_type, attended_before, class_format, enrollment_date, special_remarks)
      VALUES (?, ?, ?, ?, ?, 'center', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [first_name, last_name || null, date_of_birth, ageValue, genderValue, center_id, school_name_external || null, student_class || null, curriculumIdValue, parent_name || null, parent_contact || null, parent_alternate_contact || null, parent_email || null, parent_address || null, parent_qualification || null, parent_occupation || null, referral_source || null, program_type || null, attended_before || false, class_format || null, enrollmentDate, special_remarks || null]);
    const [newStudent] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json(newStudent[0]);
  } catch (error) {
    console.error('Create center student error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

router.put('/:id', authenticate, authorize('developer', 'trainer_head', 'registrar'), async (req, res) => {
  try {
    const fields = req.body;
    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      if (key !== 'id') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    values.push(req.params.id);
    await pool.query(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'trainer_head', 'registrar'), async (req, res) => {
  try {
    await pool.query('UPDATE students SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Approve extra student (removes is_extra flag)
router.post('/:id/approve', authenticate, authorize('developer', 'owner', 'school_teacher'), async (req, res) => {
  try {
    await pool.query('UPDATE students SET is_extra = false WHERE id = ? AND is_extra IN (true, 2)', [req.params.id]);
    const [updated] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Approve student error:', error);
    res.status(500).json({ error: 'Failed to approve student' });
  }
});

// Disapprove extra student (sets is_extra to 2)
router.post('/:id/disapprove', authenticate, authorize('developer', 'owner', 'school_teacher'), async (req, res) => {
  try {
    await pool.query('UPDATE students SET is_extra = 2 WHERE id = ? AND is_extra = true', [req.params.id]);
    const [updated] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Disapprove student error:', error);
    res.status(500).json({ error: 'Failed to disapprove student' });
  }
});

module.exports = router;
