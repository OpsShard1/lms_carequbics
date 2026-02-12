const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all school curriculums - accessible to all authenticated users for filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const [curriculums] = await pool.query(`
      SELECT sc.*, 
        (SELECT COUNT(*) FROM school_curriculum_subjects WHERE curriculum_id = sc.id AND is_active = true) as subject_count
      FROM school_curriculums sc 
      WHERE sc.is_active = true 
      ORDER BY sc.grade_name, sc.name
    `);
    res.json(curriculums);
  } catch (error) {
    console.error('Get school curriculums error:', error);
    res.status(500).json({ error: 'Failed to fetch school curriculums' });
  }
});

// Get full curriculum with subjects and projects - accessible to all authenticated users
router.get('/:id/full', authenticate, async (req, res) => {
  try {
    const [curriculum] = await pool.query('SELECT * FROM school_curriculums WHERE id = ? AND is_active = true', [req.params.id]);
    if (curriculum.length === 0) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    const [subjects] = await pool.query(`
      SELECT * FROM school_curriculum_subjects 
      WHERE curriculum_id = ? AND is_active = true 
      ORDER BY sort_order, name
    `, [req.params.id]);

    for (let subject of subjects) {
      const [projects] = await pool.query(`
        SELECT * FROM school_curriculum_projects 
        WHERE subject_id = ? AND is_active = true 
        ORDER BY sort_order, name
      `, [subject.id]);
      subject.projects = projects;
    }

    res.json({ ...curriculum[0], subjects });
  } catch (error) {
    console.error('Get full curriculum error:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum details' });
  }
});

// Create new school curriculum
router.post('/', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, grade_name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO school_curriculums (name, grade_name, description) VALUES (?, ?, ?)',
      [name, grade_name, description]
    );
    res.status(201).json({ id: result.insertId, name, grade_name, description });
  } catch (error) {
    console.error('Create school curriculum error:', error);
    res.status(500).json({ error: 'Failed to create curriculum' });
  }
});

// Update school curriculum
router.put('/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, grade_name, description } = req.body;
    await pool.query(
      'UPDATE school_curriculums SET name = ?, grade_name = ?, description = ? WHERE id = ?',
      [name, grade_name, description, req.params.id]
    );
    res.json({ message: 'Curriculum updated' });
  } catch (error) {
    console.error('Update school curriculum error:', error);
    res.status(500).json({ error: 'Failed to update curriculum' });
  }
});

// Delete school curriculum
router.delete('/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE school_curriculums SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Curriculum deleted' });
  } catch (error) {
    console.error('Delete school curriculum error:', error);
    res.status(500).json({ error: 'Failed to delete curriculum' });
  }
});

// Add subject to curriculum
router.post('/:curriculumId/subjects', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const [result] = await pool.query(
      'INSERT INTO school_curriculum_subjects (curriculum_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [req.params.curriculumId, name, description, sort_order || 0]
    );
    res.status(201).json({ id: result.insertId, name, description });
  } catch (error) {
    console.error('Add subject error:', error);
    res.status(500).json({ error: 'Failed to add subject' });
  }
});

// Update subject
router.put('/subjects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    await pool.query(
      'UPDATE school_curriculum_subjects SET name = ?, description = ?, sort_order = ? WHERE id = ?',
      [name, description, sort_order, req.params.id]
    );
    res.json({ message: 'Subject updated' });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete subject
router.delete('/subjects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE school_curriculum_subjects SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Add project to subject
router.post('/subjects/:subjectId/projects', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const [result] = await pool.query(
      'INSERT INTO school_curriculum_projects (subject_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [req.params.subjectId, name, description, sort_order || 0]
    );
    res.status(201).json({ id: result.insertId, name, description });
  } catch (error) {
    console.error('Add project error:', error);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// Update project
router.put('/projects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    await pool.query(
      'UPDATE school_curriculum_projects SET name = ?, description = ?, sort_order = ? WHERE id = ?',
      [name, description, sort_order, req.params.id]
    );
    res.json({ message: 'Project updated' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/projects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE school_curriculum_projects SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Assign curriculum to class - only for users who can create classes
router.post('/assign', authenticate, authorize('developer', 'owner', 'school_teacher'), async (req, res) => {
  try {
    const { class_id, curriculum_id } = req.body;
    const [result] = await pool.query(
      'INSERT INTO class_curriculum_assignments (class_id, curriculum_id, assigned_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_active = true, assigned_by = ?, curriculum_id = ?',
      [class_id, curriculum_id, req.user.id, req.user.id, curriculum_id]
    );
    res.status(201).json({ message: 'Curriculum assigned to class' });
  } catch (error) {
    console.error('Assign curriculum error:', error);
    res.status(500).json({ error: 'Failed to assign curriculum' });
  }
});

// Get class curriculum and progress - accessible to all authenticated users
router.get('/class/:classId/progress', authenticate, async (req, res) => {
  try {
    // Get assigned curriculum
    const [assignment] = await pool.query(`
      SELECT cca.*, sc.name as curriculum_name, sc.grade_name, sc.description
      FROM class_curriculum_assignments cca
      JOIN school_curriculums sc ON cca.curriculum_id = sc.id
      WHERE cca.class_id = ? AND cca.is_active = true
    `, [req.params.classId]);

    if (assignment.length === 0) {
      return res.json({ curriculum: null, subjects: [] });
    }

    const curriculum = assignment[0];

    // Get subjects with projects and progress
    const [subjects] = await pool.query(`
      SELECT * FROM school_curriculum_subjects 
      WHERE curriculum_id = ? AND is_active = true 
      ORDER BY sort_order, name
    `, [curriculum.curriculum_id]);

    for (let subject of subjects) {
      const [projects] = await pool.query(`
        SELECT 
          scp.*,
          cpp.status,
          cpp.completion_date,
          cpp.remarks,
          cpp.marked_by,
          u.first_name as marked_by_name
        FROM school_curriculum_projects scp
        LEFT JOIN class_project_progress cpp ON scp.id = cpp.project_id AND cpp.class_id = ?
        LEFT JOIN users u ON cpp.marked_by = u.id
        WHERE scp.subject_id = ? AND scp.is_active = true 
        ORDER BY scp.sort_order, scp.name
      `, [req.params.classId, subject.id]);
      subject.projects = projects;
    }

    res.json({ curriculum, subjects });
  } catch (error) {
    console.error('Get class progress error:', error);
    res.status(500).json({ error: 'Failed to fetch class progress' });
  }
});

// Update class project progress
router.put('/class/:classId/project/:projectId', authenticate, authorize('developer', 'trainer_head', 'trainer'), async (req, res) => {
  try {
    const { classId, projectId } = req.params;
    const { status, completion_date, remarks } = req.body;

    await pool.query(`
      INSERT INTO class_project_progress (class_id, project_id, status, completion_date, remarks, marked_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status),
        completion_date = VALUES(completion_date),
        remarks = VALUES(remarks),
        marked_by = VALUES(marked_by)
    `, [classId, projectId, status, completion_date, remarks, req.user.id]);

    res.json({ message: 'Progress updated' });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;
