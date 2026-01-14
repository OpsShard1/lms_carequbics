import express from 'express';
import pool from '../database/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get progress for a student
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const [progress] = await pool.query(`
      SELECT sp.*, u.first_name as trainer_first_name, u.last_name as trainer_last_name
      FROM student_progress sp
      LEFT JOIN users u ON sp.trainer_id = u.id
      WHERE sp.student_id = ?
      ORDER BY sp.chapter_number, sp.created_at
    `, [req.params.studentId]);
    res.json(progress);
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get progress for a center
router.get('/center/:centerId', authenticate, async (req, res) => {
  try {
    const [progress] = await pool.query(`
      SELECT sp.*, s.first_name, s.last_name, u.first_name as trainer_first_name
      FROM student_progress sp
      JOIN students s ON sp.student_id = s.id
      LEFT JOIN users u ON sp.trainer_id = u.id
      WHERE sp.center_id = ?
      ORDER BY s.first_name, sp.chapter_number
    `, [req.params.centerId]);
    res.json(progress);
  } catch (error) {
    console.error('Get center progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Add/Update progress entry
router.post('/', authenticate, authorize('developer', 'owner', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { 
      student_id, center_id, chapter_name, chapter_number, 
      completion_status, evaluation_score, remarks 
    } = req.body;

    if (!student_id || !center_id || !chapter_name) {
      return res.status(400).json({ error: 'Student, center, and chapter name are required' });
    }

    // Check if entry exists
    const [existing] = await pool.query(`
      SELECT id FROM student_progress 
      WHERE student_id = ? AND center_id = ? AND chapter_name = ?
    `, [student_id, center_id, chapter_name]);

    let result;
    if (existing.length > 0) {
      await pool.query(`
        UPDATE student_progress 
        SET completion_status = ?, evaluation_score = ?, remarks = ?, trainer_id = ?,
            completed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_at END
        WHERE id = ?
      `, [completion_status, evaluation_score, remarks, req.user.id, completion_status, existing[0].id]);
      result = { id: existing[0].id };
    } else {
      const [insertResult] = await pool.query(`
        INSERT INTO student_progress 
        (student_id, center_id, chapter_name, chapter_number, completion_status, 
         evaluation_score, remarks, trainer_id, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'completed' THEN NOW() ELSE NULL END)
      `, [student_id, center_id, chapter_name, chapter_number, completion_status, 
          evaluation_score, remarks, req.user.id, completion_status]);
      result = { id: insertResult.insertId };
    }

    const [newProgress] = await pool.query('SELECT * FROM student_progress WHERE id = ?', [result.id]);
    res.status(201).json(newProgress[0]);
  } catch (error) {
    console.error('Add progress error:', error);
    res.status(500).json({ error: 'Failed to add progress' });
  }
});

// Delete progress entry
router.delete('/:id', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('DELETE FROM student_progress WHERE id = ?', [req.params.id]);
    res.json({ message: 'Progress entry deleted' });
  } catch (error) {
    console.error('Delete progress error:', error);
    res.status(500).json({ error: 'Failed to delete progress' });
  }
});

// =============================================
// PARENT PROGRESS VIEW (Public - No Auth)
// =============================================

// Get student progress for parent (public endpoint)
router.post('/parent/view', async (req, res) => {
  try {
    const { student_name, date_of_birth } = req.body;

    if (!student_name || !date_of_birth) {
      return res.status(400).json({ error: 'Student name and date of birth are required' });
    }

    // Find student by name and DOB
    const [students] = await pool.query(`
      SELECT id, first_name, last_name, center_id
      FROM students 
      WHERE CONCAT(first_name, ' ', COALESCE(last_name, '')) LIKE ? 
        AND date_of_birth = ? 
        AND student_type = 'center'
        AND is_active = true
    `, [`%${student_name}%`, date_of_birth]);

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found. Please check the name and date of birth.' });
    }

    const student = students[0];

    // Get attendance summary
    const [attendanceSummary] = await pool.query(`
      SELECT 
        COUNT(*) as total_classes,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
      FROM attendance
      WHERE student_id = ?
    `, [student.id]);

    // Get progress
    const [progress] = await pool.query(`
      SELECT chapter_name, chapter_number, completion_status, evaluation_score, remarks, completed_at
      FROM student_progress
      WHERE student_id = ?
      ORDER BY chapter_number
    `, [student.id]);

    res.json({
      student: {
        name: `${student.first_name} ${student.last_name || ''}`.trim()
      },
      attendance: {
        ...attendanceSummary[0],
        percentage: attendanceSummary[0].total_classes > 0 
          ? ((attendanceSummary[0].present / attendanceSummary[0].total_classes) * 100).toFixed(1)
          : 0
      },
      progress
    });
  } catch (error) {
    console.error('Parent view error:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});

export default router;
