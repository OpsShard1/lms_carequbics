import express from 'express';
import pool from '../database/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =============================================
// CURRICULUMS
// =============================================

// Get all curriculums
router.get('/', authenticate, async (req, res) => {
  try {
    const [curriculums] = await pool.query(`
      SELECT c.*, u.first_name as created_by_name
      FROM curriculums c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.is_active = true
      ORDER BY c.name
    `);
    res.json(curriculums);
  } catch (error) {
    console.error('Get curriculums error:', error);
    res.status(500).json({ error: 'Failed to fetch curriculums' });
  }
});

// Get curriculum with subjects and topics
router.get('/:id/full', authenticate, async (req, res) => {
  try {
    const [curriculum] = await pool.query('SELECT * FROM curriculums WHERE id = ?', [req.params.id]);
    if (curriculum.length === 0) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    const [subjects] = await pool.query(`
      SELECT * FROM curriculum_subjects 
      WHERE curriculum_id = ? AND is_active = true 
      ORDER BY sort_order, name
    `, [req.params.id]);

    for (const subject of subjects) {
      const [topics] = await pool.query(`
        SELECT * FROM curriculum_topics 
        WHERE subject_id = ? AND is_active = true 
        ORDER BY sort_order, name
      `, [subject.id]);
      subject.topics = topics;
    }

    res.json({ ...curriculum[0], subjects });
  } catch (error) {
    console.error('Get curriculum full error:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum' });
  }
});

// Create curriculum (trainer_head only)
router.post('/', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO curriculums (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    );
    const [newCurriculum] = await pool.query('SELECT * FROM curriculums WHERE id = ?', [result.insertId]);
    res.status(201).json(newCurriculum[0]);
  } catch (error) {
    console.error('Create curriculum error:', error);
    res.status(500).json({ error: 'Failed to create curriculum' });
  }
});

// Update curriculum
router.put('/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description } = req.body;
    await pool.query('UPDATE curriculums SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM curriculums WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update curriculum error:', error);
    res.status(500).json({ error: 'Failed to update curriculum' });
  }
});

// Delete curriculum
router.delete('/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE curriculums SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Curriculum deleted' });
  } catch (error) {
    console.error('Delete curriculum error:', error);
    res.status(500).json({ error: 'Failed to delete curriculum' });
  }
});

// =============================================
// SUBJECTS
// =============================================

// Get subjects by curriculum
router.get('/:curriculumId/subjects', authenticate, async (req, res) => {
  try {
    const [subjects] = await pool.query(`
      SELECT * FROM curriculum_subjects 
      WHERE curriculum_id = ? AND is_active = true 
      ORDER BY sort_order, name
    `, [req.params.curriculumId]);
    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Create subject
router.post('/:curriculumId/subjects', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const [result] = await pool.query(
      'INSERT INTO curriculum_subjects (curriculum_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [req.params.curriculumId, name, description, sort_order || 0]
    );
    const [newSubject] = await pool.query('SELECT * FROM curriculum_subjects WHERE id = ?', [result.insertId]);
    res.status(201).json(newSubject[0]);
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// Update subject
router.put('/subjects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    await pool.query('UPDATE curriculum_subjects SET name = ?, description = ?, sort_order = ? WHERE id = ?', 
      [name, description, sort_order || 0, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM curriculum_subjects WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete subject
router.delete('/subjects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE curriculum_subjects SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// =============================================
// TOPICS
// =============================================

// Get topics by subject
router.get('/subjects/:subjectId/topics', authenticate, async (req, res) => {
  try {
    const [topics] = await pool.query(`
      SELECT * FROM curriculum_topics 
      WHERE subject_id = ? AND is_active = true 
      ORDER BY sort_order, name
    `, [req.params.subjectId]);
    res.json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// Create topic
router.post('/subjects/:subjectId/topics', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const [result] = await pool.query(
      'INSERT INTO curriculum_topics (subject_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [req.params.subjectId, name, description, sort_order || 0]
    );
    const [newTopic] = await pool.query('SELECT * FROM curriculum_topics WHERE id = ?', [result.insertId]);
    res.status(201).json(newTopic[0]);
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// Update topic
router.put('/topics/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    await pool.query('UPDATE curriculum_topics SET name = ?, description = ?, sort_order = ? WHERE id = ?', 
      [name, description, sort_order || 0, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM curriculum_topics WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

// Delete topic
router.delete('/topics/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE curriculum_topics SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Topic deleted' });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// =============================================
// STUDENT TOPIC PROGRESS
// =============================================

// Get student progress for all topics
router.get('/progress/student/:studentId', authenticate, async (req, res) => {
  try {
    const [progress] = await pool.query(`
      SELECT stp.*, ct.name as topic_name, cs.name as subject_name, c.name as curriculum_name,
             ct.subject_id, cs.curriculum_id
      FROM student_topic_progress stp
      JOIN curriculum_topics ct ON stp.topic_id = ct.id
      JOIN curriculum_subjects cs ON ct.subject_id = cs.id
      JOIN curriculums c ON cs.curriculum_id = c.id
      WHERE stp.student_id = ?
      ORDER BY c.name, cs.sort_order, ct.sort_order
    `, [req.params.studentId]);
    res.json(progress);
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get/Create progress for a specific topic
router.get('/progress/student/:studentId/topic/:topicId', authenticate, async (req, res) => {
  try {
    const { studentId, topicId } = req.params;
    
    let [progress] = await pool.query(
      'SELECT * FROM student_topic_progress WHERE student_id = ? AND topic_id = ?',
      [studentId, topicId]
    );
    
    if (progress.length === 0) {
      // Get student's center_id
      const [student] = await pool.query('SELECT center_id FROM students WHERE id = ?', [studentId]);
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      // Create new progress record
      const [result] = await pool.query(`
        INSERT INTO student_topic_progress (student_id, topic_id, center_id, status)
        VALUES (?, ?, ?, 'not_started')
      `, [studentId, topicId, student[0].center_id]);
      
      [progress] = await pool.query('SELECT * FROM student_topic_progress WHERE id = ?', [result.insertId]);
    }
    
    res.json(progress[0]);
  } catch (error) {
    console.error('Get topic progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update student topic progress
router.put('/progress/student/:studentId/topic/:topicId', authenticate, authorize('developer', 'trainer_head', 'trainer'), async (req, res) => {
  try {
    const { studentId, topicId } = req.params;
    const { 
      status, concept_understanding, application_of_knowledge, hands_on_skill,
      communication_skill, consistency, idea_generation, iteration_improvement, remarks 
    } = req.body;

    // Check if progress exists
    let [existing] = await pool.query(
      'SELECT id FROM student_topic_progress WHERE student_id = ? AND topic_id = ?',
      [studentId, topicId]
    );

    const completedAt = status === 'completed' ? new Date() : null;

    if (existing.length > 0) {
      await pool.query(`
        UPDATE student_topic_progress SET
          status = ?, concept_understanding = ?, application_of_knowledge = ?,
          hands_on_skill = ?, communication_skill = ?, consistency = ?,
          idea_generation = ?, iteration_improvement = ?, remarks = ?,
          trainer_id = ?, completed_at = ?
        WHERE student_id = ? AND topic_id = ?
      `, [status, concept_understanding, application_of_knowledge, hands_on_skill,
          communication_skill, consistency, idea_generation, iteration_improvement,
          remarks, req.user.id, completedAt, studentId, topicId]);
    } else {
      // Get student's center_id
      const [student] = await pool.query('SELECT center_id FROM students WHERE id = ?', [studentId]);
      
      await pool.query(`
        INSERT INTO student_topic_progress 
        (student_id, topic_id, center_id, status, concept_understanding, application_of_knowledge,
         hands_on_skill, communication_skill, consistency, idea_generation, iteration_improvement,
         remarks, trainer_id, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [studentId, topicId, student[0].center_id, status, concept_understanding, 
          application_of_knowledge, hands_on_skill, communication_skill, consistency,
          idea_generation, iteration_improvement, remarks, req.user.id, completedAt]);
    }

    const [updated] = await pool.query(
      'SELECT * FROM student_topic_progress WHERE student_id = ? AND topic_id = ?',
      [studentId, topicId]
    );
    res.json(updated[0]);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;
