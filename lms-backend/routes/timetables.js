const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize, checkSectionAccess } = require('../middleware/auth');

const router = express.Router();

// Get timetable for a school (for trainers to view)
router.get('/school/:schoolId/consolidated', authenticate, async (req, res) => {
  try {
    const [timetable] = await pool.query(
      'SELECT * FROM school_timetables WHERE school_id = ? AND is_active = true',
      [req.params.schoolId]
    );
    
    if (timetable.length === 0) {
      return res.json(null);
    }

    const timetableId = timetable[0].id;

    const [periods] = await pool.query(
      'SELECT * FROM timetable_periods WHERE timetable_id = ? ORDER BY period_number',
      [timetableId]
    );

    const [days] = await pool.query(
      'SELECT * FROM timetable_days WHERE timetable_id = ? ORDER BY day_of_week',
      [timetableId]
    );

    const [schedule] = await pool.query(`
      SELECT tcs.*, c.name as class_name, c.grade, c.section
      FROM timetable_class_schedule tcs
      JOIN classes c ON tcs.class_id = c.id
      WHERE tcs.timetable_id = ?
      ORDER BY tcs.day_of_week, tcs.period_number
    `, [timetableId]);

    res.json({
      timetable: timetable[0],
      periods,
      days,
      schedule
    });
  } catch (error) {
    console.error('Get consolidated timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Get timetable for school (for management)
router.get('/school/:schoolId', authenticate, checkSectionAccess('school'), async (req, res) => {
  try {
    const [timetable] = await pool.query(
      'SELECT * FROM school_timetables WHERE school_id = ? AND is_active = true',
      [req.params.schoolId]
    );
    
    if (timetable.length === 0) {
      return res.json(null);
    }

    const timetableId = timetable[0].id;

    const [periods] = await pool.query(
      'SELECT * FROM timetable_periods WHERE timetable_id = ? ORDER BY period_number',
      [timetableId]
    );

    const [days] = await pool.query(
      'SELECT * FROM timetable_days WHERE timetable_id = ? ORDER BY day_of_week',
      [timetableId]
    );

    const [schedule] = await pool.query(`
      SELECT tcs.*, c.name as class_name, c.grade, c.section
      FROM timetable_class_schedule tcs
      JOIN classes c ON tcs.class_id = c.id
      WHERE tcs.timetable_id = ?
      ORDER BY tcs.day_of_week, tcs.period_number
    `, [timetableId]);

    res.json({
      timetable: timetable[0],
      periods,
      days,
      schedule
    });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Create new timetable with periods and days
router.post('/', authenticate, authorize('developer', 'owner', 'school_teacher', 'trainer', 'trainer_head'), checkSectionAccess('school'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id, name, periods, days } = req.body;

    if (!school_id) {
      await connection.rollback();
      return res.status(400).json({ error: 'School is required' });
    }

    if (!periods || periods.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Periods are required' });
    }

    if (!days || days.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Days are required' });
    }

    // Check if timetable already exists
    const [existing] = await connection.query(
      'SELECT id FROM school_timetables WHERE school_id = ? AND is_active = true',
      [school_id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Timetable already exists for this school' });
    }

    // Create timetable
    const [result] = await connection.query(
      'INSERT INTO school_timetables (school_id, name) VALUES (?, ?)',
      [school_id, name || 'School Timetable']
    );

    const timetableId = result.insertId;

    // Insert periods
    for (const period of periods) {
      await connection.query(
        'INSERT INTO timetable_periods (timetable_id, period_number, start_time, end_time) VALUES (?, ?, ?, ?)',
        [timetableId, period.period_number, period.start_time, period.end_time]
      );
    }

    // Insert days
    for (const day of days) {
      await connection.query(
        'INSERT INTO timetable_days (timetable_id, day_of_week) VALUES (?, ?)',
        [timetableId, day]
      );
    }

    await connection.commit();

    const [newTimetable] = await pool.query('SELECT * FROM school_timetables WHERE id = ?', [timetableId]);
    const [newPeriods] = await pool.query('SELECT * FROM timetable_periods WHERE timetable_id = ? ORDER BY period_number', [timetableId]);
    const [newDays] = await pool.query('SELECT * FROM timetable_days WHERE timetable_id = ? ORDER BY day_of_week', [timetableId]);

    res.status(201).json({
      timetable: newTimetable[0],
      periods: newPeriods,
      days: newDays,
      schedule: []
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create timetable error:', error);
    res.status(500).json({ error: 'Failed to create timetable' });
  } finally {
    connection.release();
  }
});

// Update class schedule (assign/remove classes to time slots)
router.put('/:id/schedule', authenticate, authorize('developer', 'owner', 'school_teacher', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { schedule } = req.body;

    // Delete existing schedule
    await pool.query('DELETE FROM timetable_class_schedule WHERE timetable_id = ?', [req.params.id]);

    // Insert new schedule
    if (schedule && schedule.length > 0) {
      for (const entry of schedule) {
        await pool.query(
          'INSERT INTO timetable_class_schedule (timetable_id, class_id, day_of_week, period_number) VALUES (?, ?, ?, ?)',
          [req.params.id, entry.class_id, entry.day_of_week, entry.period_number]
        );
      }
    }

    const [updatedSchedule] = await pool.query(`
      SELECT tcs.*, c.name as class_name, c.grade, c.section
      FROM timetable_class_schedule tcs
      JOIN classes c ON tcs.class_id = c.id
      WHERE tcs.timetable_id = ?
      ORDER BY tcs.day_of_week, tcs.period_number
    `, [req.params.id]);

    res.json({ schedule: updatedSchedule });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete timetable
router.delete('/:id', authenticate, authorize('developer', 'owner', 'school_teacher', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE school_timetables SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Delete timetable error:', error);
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

module.exports = router;
