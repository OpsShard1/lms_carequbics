const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const [progress] = await pool.query(`SELECT sp.*, u.first_name as trainer_first_name, u.last_name as trainer_last_name FROM student_progress sp LEFT JOIN users u ON sp.trainer_id = u.id WHERE sp.student_id = ? ORDER BY sp.chapter_number, sp.created_at`, [req.params.studentId]);
    res.json(progress);
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.get('/center/:centerId', authenticate, async (req, res) => {
  try {
    const [progress] = await pool.query(`SELECT sp.*, s.first_name, s.last_name, u.first_name as trainer_first_name FROM student_progress sp JOIN students s ON sp.student_id = s.id LEFT JOIN users u ON sp.trainer_id = u.id WHERE sp.center_id = ? ORDER BY s.first_name, sp.chapter_number`, [req.params.centerId]);
    res.json(progress);
  } catch (error) {
    console.error('Get center progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/', authenticate, authorize('developer', 'owner', 'trainer', 'trainer_head'), async (req, res) => {
  try {
    const { student_id, center_id, chapter_name, chapter_number, completion_status, evaluation_score, remarks } = req.body;
    if (!student_id || !center_id || !chapter_name) {
      return res.status(400).json({ error: 'Student, center, and chapter name are required' });
    }
    const [existing] = await pool.query(`SELECT id FROM student_progress WHERE student_id = ? AND center_id = ? AND chapter_name = ?`, [student_id, center_id, chapter_name]);
    let result;
    if (existing.length > 0) {
      await pool.query(`UPDATE student_progress SET completion_status = ?, evaluation_score = ?, remarks = ?, trainer_id = ?, completed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_at END WHERE id = ?`, [completion_status, evaluation_score, remarks, req.user.id, completion_status, existing[0].id]);
      result = { id: existing[0].id };
    } else {
      const [insertResult] = await pool.query(`INSERT INTO student_progress (student_id, center_id, chapter_name, chapter_number, completion_status, evaluation_score, remarks, trainer_id, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'completed' THEN NOW() ELSE NULL END)`, [student_id, center_id, chapter_name, chapter_number, completion_status, evaluation_score, remarks, req.user.id, completion_status]);
      result = { id: insertResult.insertId };
    }
    const [newProgress] = await pool.query('SELECT * FROM student_progress WHERE id = ?', [result.id]);
    res.status(201).json(newProgress[0]);
  } catch (error) {
    console.error('Add progress error:', error);
    res.status(500).json({ error: 'Failed to add progress' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('DELETE FROM student_progress WHERE id = ?', [req.params.id]);
    res.json({ message: 'Progress entry deleted' });
  } catch (error) {
    console.error('Delete progress error:', error);
    res.status(500).json({ error: 'Failed to delete progress' });
  }
});

router.post('/parent/view', async (req, res) => {
  try {
    const { student_name, phone_number, month, year } = req.body;
    if (!student_name || !phone_number) {
      return res.status(400).json({ error: 'Student name and phone number are required' });
    }
    const now = new Date();
    const selectedYear = year || now.getFullYear();
    const selectedMonth = month || (now.getMonth() + 1);
    const nameParts = student_name.trim().toLowerCase().split(/\s+/);
    let students;
    if (nameParts.length >= 2) {
      [students] = await pool.query(`SELECT s.id, s.first_name, s.last_name, s.center_id, s.curriculum_id, s.school_name_external, s.student_class, c.name as center_name FROM students s LEFT JOIN centers c ON s.center_id = c.id WHERE LOWER(s.first_name) = ? AND LOWER(COALESCE(s.last_name, '')) = ? AND s.parent_contact = ? AND s.student_type = 'center' AND s.is_active = true`, [nameParts[0], nameParts.slice(1).join(' '), phone_number]);
    } else {
      [students] = await pool.query(`SELECT s.id, s.first_name, s.last_name, s.center_id, s.curriculum_id, s.school_name_external, s.student_class, c.name as center_name FROM students s LEFT JOIN centers c ON s.center_id = c.id WHERE LOWER(s.first_name) = ? AND s.parent_contact = ? AND s.student_type = 'center' AND s.is_active = true`, [nameParts[0], phone_number]);
    }
    if (students.length === 0) {
      [students] = await pool.query(`SELECT s.id, s.first_name, s.last_name, s.center_id, s.curriculum_id, s.school_name_external, s.student_class, c.name as center_name FROM students s LEFT JOIN centers c ON s.center_id = c.id WHERE (LOWER(s.first_name) LIKE ? OR LOWER(CONCAT(s.first_name, ' ', COALESCE(s.last_name, ''))) LIKE ?) AND s.parent_contact = ? AND s.student_type = 'center' AND s.is_active = true`, [`%${nameParts[0]}%`, `%${student_name.toLowerCase()}%`, phone_number]);
    }
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found. Please check the name and phone number.' });
    }
    const student = students[0];
    let curriculum = null;
    if (student.curriculum_id) {
      const [curriculums] = await pool.query('SELECT id, name, description FROM curriculums WHERE id = ? AND is_active = true', [student.curriculum_id]);
      if (curriculums.length > 0) { curriculum = curriculums[0]; }
    }
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const [attendanceRecords] = await pool.query(`SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') as date, status FROM attendance WHERE student_id = ? AND attendance_date >= ? AND attendance_date <= ? ORDER BY attendance_date`, [student.id, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]);
    const [attendanceSummary] = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late FROM attendance WHERE student_id = ?`, [student.id]);
    const [monthlySummary] = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late FROM attendance WHERE student_id = ? AND attendance_date >= ? AND attendance_date <= ?`, [student.id, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]);
    const attendanceData = attendanceSummary[0];
    const monthlyData = monthlySummary[0];
    const attendance = {
      totalAllTime: attendanceData.total || 0,
      presentAllTime: attendanceData.present || 0,
      percentageAllTime: attendanceData.total > 0 ? Math.round((attendanceData.present / attendanceData.total) * 100) : 0,
      total: monthlyData.total || 0,
      present: monthlyData.present || 0,
      absent: monthlyData.absent || 0,
      late: monthlyData.late || 0,
      percentage: monthlyData.total > 0 ? Math.round((monthlyData.present / monthlyData.total) * 100) : 0,
      year: selectedYear,
      month: selectedMonth,
      records: attendanceRecords
    };
    let progress = [];
    if (curriculum) {
      const [subjects] = await pool.query(`SELECT id, name, description, sort_order FROM curriculum_subjects WHERE curriculum_id = ? AND is_active = true ORDER BY sort_order, name`, [curriculum.id]);
      for (const subject of subjects) {
        const [topics] = await pool.query(`SELECT ct.id, ct.name, ct.description, ct.sort_order, COALESCE(stp.status, 'not_started') as status, COALESCE(stp.concept_understanding, 0) as concept_understanding, COALESCE(stp.application_of_knowledge, 0) as application_of_knowledge, COALESCE(stp.hands_on_skill, 0) as hands_on_skill, COALESCE(stp.communication_skill, 0) as communication_skill, COALESCE(stp.consistency, 0) as consistency, COALESCE(stp.idea_generation, 0) as idea_generation, COALESCE(stp.iteration_improvement, 0) as iteration_improvement, stp.remarks, stp.completed_at FROM curriculum_topics ct LEFT JOIN student_topic_progress stp ON ct.id = stp.topic_id AND stp.student_id = ? WHERE ct.subject_id = ? AND ct.is_active = true ORDER BY ct.sort_order, ct.name`, [student.id, subject.id]);
        progress.push({ id: subject.id, name: subject.name, description: subject.description, topics: topics });
      }
    }
    res.json({
      student: { id: student.id, first_name: student.first_name, last_name: student.last_name, school_name_external: student.school_name_external, student_class: student.student_class, center_name: student.center_name },
      curriculum,
      attendance,
      progress
    });
  } catch (error) {
    console.error('Parent view error:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});

module.exports = router;


// School parent view - public endpoint for parents to view their child's progress
router.post('/school-parent/view', async (req, res) => {
  try {
    const { student_name, phone_number, month, year } = req.body;
    
    if (!student_name || !phone_number) {
      return res.status(400).json({ error: 'Student name and phone number are required' });
    }

    const now = new Date();
    const selectedYear = year || now.getFullYear();
    const selectedMonth = month || (now.getMonth() + 1);

    // Parse student name
    const nameParts = student_name.trim().toLowerCase().split(/\s+/);
    let students;

    // Try exact match first
    if (nameParts.length >= 2) {
      [students] = await pool.query(`
        SELECT s.id, s.first_name, s.last_name, s.school_id, s.class_id,
               sc.name as school_name, c.name as class_name
        FROM students s
        LEFT JOIN schools sc ON s.school_id = sc.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE LOWER(s.first_name) = ? 
          AND LOWER(COALESCE(s.last_name, '')) = ? 
          AND s.parent_contact = ?
          AND s.student_type = 'school'
          AND s.is_active = true
      `, [nameParts[0], nameParts.slice(1).join(' '), phone_number]);
    } else {
      [students] = await pool.query(`
        SELECT s.id, s.first_name, s.last_name, s.school_id, s.class_id,
               sc.name as school_name, c.name as class_name
        FROM students s
        LEFT JOIN schools sc ON s.school_id = sc.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE LOWER(s.first_name) = ? 
          AND s.parent_contact = ?
          AND s.student_type = 'school'
          AND s.is_active = true
      `, [nameParts[0], phone_number]);
    }

    // Try fuzzy match if exact match fails
    if (students.length === 0) {
      [students] = await pool.query(`
        SELECT s.id, s.first_name, s.last_name, s.school_id, s.class_id,
               sc.name as school_name, c.name as class_name
        FROM students s
        LEFT JOIN schools sc ON s.school_id = sc.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE (LOWER(s.first_name) LIKE ? OR LOWER(CONCAT(s.first_name, ' ', COALESCE(s.last_name, ''))) LIKE ?)
          AND s.parent_contact = ?
          AND s.student_type = 'school'
          AND s.is_active = true
      `, [`%${nameParts[0]}%`, `%${student_name.toLowerCase()}%`, phone_number]);
    }

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found. Please check the name and phone number.' });
    }

    const student = students[0];

    // Get class curriculum progress if class is assigned
    let classProgress = null;
    if (student.class_id) {
      const [curriculum] = await pool.query(`
        SELECT cca.curriculum_id, sc.name as curriculum_name, sc.grade_name, sc.description
        FROM class_curriculum_assignments cca
        JOIN school_curriculums sc ON cca.curriculum_id = sc.id
        WHERE cca.class_id = ? AND cca.is_active = true
      `, [student.class_id]);

      if (curriculum.length > 0) {
        // Get subjects with projects and progress
        const [subjects] = await pool.query(`
          SELECT * FROM school_curriculum_subjects 
          WHERE curriculum_id = ? AND is_active = true 
          ORDER BY sort_order, name
        `, [curriculum[0].curriculum_id]);

        for (let subject of subjects) {
          const [projects] = await pool.query(`
            SELECT 
              scp.*,
              cpp.status,
              cpp.completion_date,
              cpp.remarks
            FROM school_curriculum_projects scp
            LEFT JOIN class_project_progress cpp ON scp.id = cpp.project_id AND cpp.class_id = ?
            WHERE scp.subject_id = ? AND scp.is_active = true 
            ORDER BY scp.sort_order, scp.name
          `, [student.class_id, subject.id]);
          subject.projects = projects;
        }

        classProgress = {
          curriculum: curriculum[0],
          subjects: subjects
        };
      }
    }

    // Get attendance data
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);

    const [attendanceRecords] = await pool.query(`
      SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') as date, status 
      FROM attendance 
      WHERE student_id = ? 
        AND attendance_date >= ? 
        AND attendance_date <= ?
        AND attendance_type = 'school'
      ORDER BY attendance_date
    `, [student.id, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]);

    const [attendanceSummary] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance 
      WHERE student_id = ? AND attendance_type = 'school'
    `, [student.id]);

    const [monthlySummary] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance 
      WHERE student_id = ? 
        AND attendance_date >= ? 
        AND attendance_date <= ?
        AND attendance_type = 'school'
    `, [student.id, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]);

    const attendanceData = attendanceSummary[0];
    const monthlyData = monthlySummary[0];

    const attendance = {
      totalAllTime: attendanceData.total || 0,
      presentAllTime: attendanceData.present || 0,
      percentageAllTime: attendanceData.total > 0 ? Math.round((attendanceData.present / attendanceData.total) * 100) : 0,
      total: monthlyData.total || 0,
      present: monthlyData.present || 0,
      absent: monthlyData.absent || 0,
      late: monthlyData.late || 0,
      percentage: monthlyData.total > 0 ? Math.round((monthlyData.present / monthlyData.total) * 100) : 0,
      records: attendanceRecords
    };

    res.json({
      student,
      classProgress,
      attendance
    });
  } catch (error) {
    console.error('School parent view error:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});


// Detect student type (center or school) for parent portal
router.post('/detect-student-type', async (req, res) => {
  try {
    const { student_name, phone_number } = req.body;
    
    if (!student_name || !phone_number) {
      return res.status(400).json({ error: 'Student name and phone number are required' });
    }

    // Parse student name
    const nameParts = student_name.trim().toLowerCase().split(/\s+/);
    let students;

    // Try exact match first
    if (nameParts.length >= 2) {
      [students] = await pool.query(`
        SELECT id, first_name, last_name, student_type
        FROM students
        WHERE LOWER(first_name) = ? 
          AND LOWER(COALESCE(last_name, '')) = ? 
          AND parent_contact = ?
          AND is_active = true
      `, [nameParts[0], nameParts.slice(1).join(' '), phone_number]);
    } else {
      [students] = await pool.query(`
        SELECT id, first_name, last_name, student_type
        FROM students
        WHERE LOWER(first_name) = ? 
          AND parent_contact = ?
          AND is_active = true
      `, [nameParts[0], phone_number]);
    }

    // Try fuzzy match if exact match fails
    if (students.length === 0) {
      [students] = await pool.query(`
        SELECT id, first_name, last_name, student_type
        FROM students
        WHERE (LOWER(first_name) LIKE ? OR LOWER(CONCAT(first_name, ' ', COALESCE(last_name, ''))) LIKE ?)
          AND parent_contact = ?
          AND is_active = true
      `, [`%${nameParts[0]}%`, `%${student_name.toLowerCase()}%`, phone_number]);
    }

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found. Please check the name and phone number.' });
    }

    const student = students[0];
    res.json({ student_type: student.student_type });
  } catch (error) {
    console.error('Detect student type error:', error);
    res.status(500).json({ error: 'Failed to detect student type' });
  }
});
