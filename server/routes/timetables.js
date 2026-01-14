import express from 'express';
import pool from '../database/connection.js';
import { authenticate, authorize, checkSectionAccess } from '../middleware/auth.js';

const router = express.Router();

// Get timetables for a school
router.get('/school/:schoolId', authenticate, checkSectionAccess('school'), async (req, res) => {
  try {
    const [timetables] = await pool.query(`
      SELECT t.*, c.name as class_name, c.grade, c.section
      FROM timetables t
      JOIN classes c ON t.class_id = c.id
      WHERE t.school_id = ? AND t.is_active = true
      ORDER BY c.grade, c.section
    `, [req.params.schoolId]);
    res.json(timetables);
  } catch (error) {
    console.error('Get timetables error:', error);
    res.status(500).json({ error: 'Failed to fetch timetables' });
  }
});

// Get timetable by ID with entries
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [timetables] = await pool.query(`
      SELECT t.*, c.name as class_name, c.grade, c.section, s.name as school_name
      FROM timetables t
      JOIN classes c ON t.class_id = c.id
      JOIN schools s ON t.school_id = s.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (timetables.length === 0) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    // Get entries
    const [entries] = await pool.query(`
      SELECT te.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
      FROM timetable_entries te
      LEFT JOIN users u ON te.teacher_id = u.id
      WHERE te.timetable_id = ?
      ORDER BY te.day_of_week, te.period_number
    `, [req.params.id]);

    res.json({ ...timetables[0], entries });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Get timetable for a class
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const [timetables] = await pool.query(`
      SELECT t.*, c.name as class_name
      FROM timetables t
      JOIN classes c ON t.class_id = c.id
      WHERE t.class_id = ? AND t.is_active = true
    `, [req.params.classId]);

    if (timetables.length === 0) {
      return res.json(null);
    }

    const [entries] = await pool.query(`
      SELECT te.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
      FROM timetable_entries te
      LEFT JOIN users u ON te.teacher_id = u.id
      WHERE te.timetable_id = ?
      ORDER BY te.day_of_week, te.period_number
    `, [timetables[0].id]);

    res.json({ ...timetables[0], entries });
  } catch (error) {
    console.error('Get class timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Create timetable
router.post('/', authenticate, authorize('developer', 'owner', 'school_teacher'), checkSectionAccess('school'), async (req, res) => {
  try {
    const { school_id, class_id, name, periods_per_day, entries } = req.body;

    if (!school_id || !class_id || !periods_per_day) {
      return res.status(400).json({ error: 'School, class, and periods per day are required' });
    }

    // Check if timetable already exists for this class
    const [existing] = await pool.query(
      'SELECT id FROM timetables WHERE class_id = ? AND is_active = true',
      [class_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Timetable already exists for this class' });
    }

    const [result] = await pool.query(
      'INSERT INTO timetables (school_id, class_id, name, periods_per_day) VALUES (?, ?, ?, ?)',
      [school_id, class_id, name, periods_per_day]
    );

    // Add entries if provided
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        await pool.query(`
          INSERT INTO timetable_entries 
          (timetable_id, day_of_week, period_number, start_time, end_time, subject, teacher_id, room_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [result.insertId, entry.day_of_week, entry.period_number, entry.start_time, 
            entry.end_time, entry.subject, entry.teacher_id, entry.room_number]);
      }
    }

    const [newTimetable] = await pool.query('SELECT * FROM timetables WHERE id = ?', [result.insertId]);
    res.status(201).json(newTimetable[0]);
  } catch (error) {
    console.error('Create timetable error:', error);
    res.status(500).json({ error: 'Failed to create timetable' });
  }
});

// Update timetable entries
router.put('/:id/entries', authenticate, authorize('developer', 'owner', 'school_teacher'), async (req, res) => {
  try {
    const { entries } = req.body;

    // Delete existing entries
    await pool.query('DELETE FROM timetable_entries WHERE timetable_id = ?', [req.params.id]);

    // Add new entries
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        await pool.query(`
          INSERT INTO timetable_entries 
          (timetable_id, day_of_week, period_number, start_time, end_time, subject, teacher_id, room_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.params.id, entry.day_of_week, entry.period_number, entry.start_time, 
            entry.end_time, entry.subject, entry.teacher_id, entry.room_number]);
      }
    }

    // Return updated timetable with entries
    const [timetable] = await pool.query('SELECT * FROM timetables WHERE id = ?', [req.params.id]);
    const [updatedEntries] = await pool.query('SELECT * FROM timetable_entries WHERE timetable_id = ?', [req.params.id]);

    res.json({ ...timetable[0], entries: updatedEntries });
  } catch (error) {
    console.error('Update timetable entries error:', error);
    res.status(500).json({ error: 'Failed to update timetable entries' });
  }
});

// Delete timetable (soft delete)
router.delete('/:id', authenticate, authorize('developer', 'owner', 'school_teacher'), async (req, res) => {
  try {
    await pool.query('UPDATE timetables SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Delete timetable error:', error);
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

export default router;
