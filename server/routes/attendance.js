import express from 'express';
import pool from '../database/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =============================================
// SCHOOL ATTENDANCE (Timetable-driven)
// =============================================

// Get school attendance for a date
router.get('/school/:schoolId/date/:date', authenticate, async (req, res) => {
  try {
    const { schoolId, date } = req.params;
    const { classId } = req.query;

    let query = `
      SELECT a.*, s.first_name, s.last_name, c.name as class_name,
             te.subject, te.period_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN timetable_entries te ON a.timetable_entry_id = te.id
      WHERE a.school_id = ? AND a.attendance_date = ? AND a.attendance_type = 'school'
    `;
    const params = [schoolId, date];

    if (classId) {
      query += ' AND a.class_id = ?';
      params.push(classId);
    }

    query += ' ORDER BY c.name, te.period_number, s.first_name';

    const [attendance] = await pool.query(query, params);
    res.json(attendance);
  } catch (error) {
    console.error('Get school attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get students for attendance marking (based on timetable)
router.get('/school/:schoolId/students/:date', authenticate, async (req, res) => {
  try {
    const { schoolId, date } = req.params;
    const { classId } = req.query;

    // Get day of week from date
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    let query = `
      SELECT DISTINCT s.id, s.first_name, s.last_name, s.class_id, 
             c.name as class_name, c.grade, c.section,
             te.id as timetable_entry_id, te.period_number, te.subject, te.start_time, te.end_time
      FROM students s
      JOIN classes c ON s.class_id = c.id
      JOIN timetables t ON t.class_id = c.id AND t.is_active = true
      JOIN timetable_entries te ON te.timetable_id = t.id AND te.day_of_week = ?
      WHERE s.school_id = ? AND s.student_type = 'school' AND s.is_active = true
    `;
    const params = [dayOfWeek, schoolId];

    if (classId) {
      query += ' AND s.class_id = ?';
      params.push(classId);
    }

    query += ' ORDER BY c.name, te.period_number, s.first_name';

    const [students] = await pool.query(query, params);

    // Get existing attendance for this date
    const [existingAttendance] = await pool.query(`
      SELECT student_id, timetable_entry_id, status 
      FROM attendance 
      WHERE school_id = ? AND attendance_date = ? AND attendance_type = 'school'
    `, [schoolId, date]);

    // Map existing attendance to students
    const attendanceMap = {};
    existingAttendance.forEach(a => {
      attendanceMap[`${a.student_id}-${a.timetable_entry_id}`] = a.status;
    });

    const studentsWithAttendance = students.map(s => ({
      ...s,
      existing_status: attendanceMap[`${s.id}-${s.timetable_entry_id}`] || null
    }));

    res.json(studentsWithAttendance);
  } catch (error) {
    console.error('Get students for attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Mark school attendance (bulk)
router.post('/school/mark', authenticate, authorize('developer', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { school_id, class_id, attendance_date, records } = req.body;

    if (!school_id || !attendance_date || !records || records.length === 0) {
      return res.status(400).json({ error: 'School, date, and attendance records are required' });
    }

    for (const record of records) {
      // Check if attendance already exists
      const [existing] = await pool.query(`
        SELECT id FROM attendance 
        WHERE student_id = ? AND attendance_date = ? AND timetable_entry_id = ? AND attendance_type = 'school'
      `, [record.student_id, attendance_date, record.timetable_entry_id]);

      if (existing.length > 0) {
        // Update existing
        await pool.query(`
          UPDATE attendance SET status = ?, remarks = ?, marked_by = ? WHERE id = ?
        `, [record.status, record.remarks, req.user.id, existing[0].id]);
      } else {
        // Insert new
        await pool.query(`
          INSERT INTO attendance 
          (student_id, attendance_type, school_id, class_id, timetable_entry_id, period_number, 
           attendance_date, status, remarks, marked_by)
          VALUES (?, 'school', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [record.student_id, school_id, class_id, record.timetable_entry_id, 
            record.period_number, attendance_date, record.status, record.remarks, req.user.id]);
      }
    }

    res.json({ message: 'Attendance marked successfully', count: records.length });
  } catch (error) {
    console.error('Mark school attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Mark school attendance (bulk - simple, for monthly grid)
router.post('/school/mark-bulk', authenticate, authorize('developer', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { school_id, class_id, attendance_date, records } = req.body;

    if (!school_id || !attendance_date || !records || records.length === 0) {
      return res.status(400).json({ error: 'School, date, and attendance records are required' });
    }

    for (const record of records) {
      // Check if attendance already exists for this student on this date
      const [existing] = await pool.query(`
        SELECT id FROM attendance 
        WHERE student_id = ? AND attendance_date = ? AND attendance_type = 'school' AND class_id = ?
      `, [record.student_id, attendance_date, class_id]);

      if (existing.length > 0) {
        // Update existing
        await pool.query(`
          UPDATE attendance SET status = ?, marked_by = ? WHERE id = ?
        `, [record.status, req.user.id, existing[0].id]);
      } else {
        // Insert new
        await pool.query(`
          INSERT INTO attendance 
          (student_id, attendance_type, school_id, class_id, attendance_date, status, marked_by)
          VALUES (?, 'school', ?, ?, ?, ?, ?)
        `, [record.student_id, school_id, class_id, attendance_date, record.status, req.user.id]);
      }
    }

    res.json({ message: 'Attendance marked successfully', count: records.length });
  } catch (error) {
    console.error('Mark school attendance bulk error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Get school attendance for a date range (for monthly grid)
router.get('/school/:schoolId/range', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { startDate, endDate, classId } = req.query;

    let query = `
      SELECT a.id, a.student_id, a.attendance_date, a.status
      FROM attendance a
      WHERE a.school_id = ? AND a.attendance_type = 'school'
        AND a.attendance_date >= ? AND a.attendance_date <= ?
    `;
    const params = [schoolId, startDate, endDate];

    if (classId) {
      query += ' AND a.class_id = ?';
      params.push(classId);
    }

    query += ' ORDER BY a.attendance_date, a.student_id';

    const [attendance] = await pool.query(query, params);
    res.json(attendance);
  } catch (error) {
    console.error('Get school attendance range error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// =============================================
// CENTER ATTENDANCE (Manual)
// =============================================

// Get center attendance for a date range
router.get('/center/:centerId', authenticate, async (req, res) => {
  try {
    const { centerId } = req.params;
    const { startDate, endDate, studentId } = req.query;

    let query = `
      SELECT a.*, s.first_name, s.last_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.center_id = ? AND a.attendance_type = 'center'
    `;
    const params = [centerId];

    if (startDate) {
      query += ' AND a.attendance_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND a.attendance_date <= ?';
      params.push(endDate);
    }
    if (studentId) {
      query += ' AND a.student_id = ?';
      params.push(studentId);
    }

    query += ' ORDER BY a.attendance_date DESC, a.attendance_time DESC';

    const [attendance] = await pool.query(query, params);
    res.json(attendance);
  } catch (error) {
    console.error('Get center attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Mark center attendance (manual - single record)
router.post('/center/mark', authenticate, authorize('developer', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { center_id, student_id, attendance_date, attendance_time, status, remarks } = req.body;

    if (!center_id || !student_id || !attendance_date || !status) {
      return res.status(400).json({ error: 'Center, student, date, and status are required' });
    }

    // Check if attendance already exists for this student on this date/time
    const [existing] = await pool.query(`
      SELECT id FROM attendance 
      WHERE student_id = ? AND attendance_date = ? AND attendance_time = ? AND attendance_type = 'center'
    `, [student_id, attendance_date, attendance_time || null]);

    let result;
    if (existing.length > 0) {
      await pool.query(`
        UPDATE attendance SET status = ?, remarks = ?, marked_by = ? WHERE id = ?
      `, [status, remarks, req.user.id, existing[0].id]);
      result = { id: existing[0].id, updated: true };
    } else {
      const [insertResult] = await pool.query(`
        INSERT INTO attendance 
        (student_id, attendance_type, center_id, attendance_date, attendance_time, status, remarks, marked_by)
        VALUES (?, 'center', ?, ?, ?, ?, ?, ?)
      `, [student_id, center_id, attendance_date, attendance_time, status, remarks, req.user.id]);
      result = { id: insertResult.insertId, created: true };
    }

    const [newAttendance] = await pool.query('SELECT * FROM attendance WHERE id = ?', [result.id]);
    res.status(201).json(newAttendance[0]);
  } catch (error) {
    console.error('Mark center attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Mark center attendance (bulk - for monthly grid)
router.post('/center/mark-bulk', authenticate, authorize('developer', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { center_id, attendance_date, records } = req.body;

    if (!center_id || !attendance_date || !records || records.length === 0) {
      return res.status(400).json({ error: 'Center, date, and attendance records are required' });
    }

    for (const record of records) {
      // Check if attendance already exists for this student on this date
      const [existing] = await pool.query(`
        SELECT id FROM attendance 
        WHERE student_id = ? AND attendance_date = ? AND attendance_type = 'center'
      `, [record.student_id, attendance_date]);

      if (existing.length > 0) {
        // Update existing
        await pool.query(`
          UPDATE attendance SET status = ?, marked_by = ? WHERE id = ?
        `, [record.status, req.user.id, existing[0].id]);
      } else {
        // Insert new
        await pool.query(`
          INSERT INTO attendance 
          (student_id, attendance_type, center_id, attendance_date, status, marked_by)
          VALUES (?, 'center', ?, ?, ?, ?)
        `, [record.student_id, center_id, attendance_date, record.status, req.user.id]);
      }
    }

    res.json({ message: 'Attendance marked successfully', count: records.length });
  } catch (error) {
    console.error('Mark center attendance bulk error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Delete attendance record
router.delete('/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

// =============================================
// ATTENDANCE REPORTS
// =============================================

// Get attendance summary for a student
router.get('/summary/student/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
      FROM attendance
      WHERE student_id = ?
    `;
    const params = [studentId];

    if (startDate) {
      query += ' AND attendance_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND attendance_date <= ?';
      params.push(endDate);
    }

    const [summary] = await pool.query(query, params);
    
    const result = summary[0];
    result.attendance_percentage = result.total_records > 0 
      ? ((result.present_count + result.late_count) / result.total_records * 100).toFixed(2)
      : 0;

    res.json(result);
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

export default router;
