const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [curriculums] = await pool.query(`SELECT c.*, u.first_name as created_by_name FROM curriculums c LEFT JOIN users u ON c.created_by = u.id WHERE c.is_active = true ORDER BY c.name`);
    res.json(curriculums);
  } catch (error) {
    console.error('Get curriculums error:', error);
    res.status(500).json({ error: 'Failed to fetch curriculums' });
  }
});

router.get('/:id/full', authenticate, async (req, res) => {
  try {
    const [curriculum] = await pool.query('SELECT * FROM curriculums WHERE id = ?', [req.params.id]);
    if (curriculum.length === 0) { return res.status(404).json({ error: 'Curriculum not found' }); }
    const [subjects] = await pool.query(`SELECT * FROM curriculum_subjects WHERE curriculum_id = ? AND is_active = true ORDER BY sort_order, name`, [req.params.id]);
    for (const subject of subjects) {
      const [topics] = await pool.query(`SELECT * FROM curriculum_topics WHERE subject_id = ? AND is_active = true ORDER BY sort_order, name`, [subject.id]);
      subject.topics = topics;
    }
    res.json({ ...curriculum[0], subjects });
  } catch (error) {
    console.error('Get curriculum full error:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum' });
  }
});

router.post('/', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, fees, duration_months, classes_per_installment_weekday, classes_per_installment_weekend } = req.body;
    const [result] = await pool.query(
      'INSERT INTO curriculums (name, description, fees, duration_months, classes_per_installment, classes_per_installment_weekend, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [name, description, fees || 0, duration_months || 12, classes_per_installment_weekday || 8, classes_per_installment_weekend || 4, req.user.id]
    );
    const [newCurriculum] = await pool.query('SELECT * FROM curriculums WHERE id = ?', [result.insertId]);
    res.status(201).json(newCurriculum[0]);
  } catch (error) {
    console.error('Create curriculum error:', error);
    res.status(500).json({ error: 'Failed to create curriculum' });
  }
});

router.put('/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, fees, duration_months, classes_per_installment_weekday, classes_per_installment_weekend } = req.body;
    await pool.query(
      'UPDATE curriculums SET name = ?, description = ?, fees = ?, duration_months = ?, classes_per_installment = ?, classes_per_installment_weekend = ? WHERE id = ?', 
      [name, description, fees || 0, duration_months || 12, classes_per_installment_weekday || 8, classes_per_installment_weekend || 4, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM curriculums WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update curriculum error:', error);
    res.status(500).json({ error: 'Failed to update curriculum' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE curriculums SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Curriculum deleted' });
  } catch (error) {
    console.error('Delete curriculum error:', error);
    res.status(500).json({ error: 'Failed to delete curriculum' });
  }
});

router.get('/:curriculumId/subjects', authenticate, async (req, res) => {
  try {
    const [subjects] = await pool.query(`SELECT * FROM curriculum_subjects WHERE curriculum_id = ? AND is_active = true ORDER BY sort_order, name`, [req.params.curriculumId]);
    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

router.post('/:curriculumId/subjects', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const [result] = await pool.query('INSERT INTO curriculum_subjects (curriculum_id, name, description, sort_order) VALUES (?, ?, ?, ?)', [req.params.curriculumId, name, description, sort_order || 0]);
    const [newSubject] = await pool.query('SELECT * FROM curriculum_subjects WHERE id = ?', [result.insertId]);
    res.status(201).json(newSubject[0]);
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

router.put('/subjects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    await pool.query('UPDATE curriculum_subjects SET name = ?, description = ?, sort_order = ? WHERE id = ?', [name, description, sort_order || 0, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM curriculum_subjects WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

router.delete('/subjects/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE curriculum_subjects SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

router.get('/subjects/:subjectId/topics', authenticate, async (req, res) => {
  try {
    const [topics] = await pool.query(`SELECT * FROM curriculum_topics WHERE subject_id = ? AND is_active = true ORDER BY sort_order, name`, [req.params.subjectId]);
    res.json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

router.post('/subjects/:subjectId/topics', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const [result] = await pool.query('INSERT INTO curriculum_topics (subject_id, name, description, sort_order) VALUES (?, ?, ?, ?)', [req.params.subjectId, name, description, sort_order || 0]);
    const [newTopic] = await pool.query('SELECT * FROM curriculum_topics WHERE id = ?', [result.insertId]);
    res.status(201).json(newTopic[0]);
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

router.put('/topics/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    await pool.query('UPDATE curriculum_topics SET name = ?, description = ?, sort_order = ? WHERE id = ?', [name, description, sort_order || 0, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM curriculum_topics WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

router.delete('/topics/:id', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    await pool.query('UPDATE curriculum_topics SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Topic deleted' });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

router.get('/progress/student/:studentId', authenticate, async (req, res) => {
  try {
    const [progress] = await pool.query(`SELECT stp.*, ct.name as topic_name, cs.name as subject_name, c.name as curriculum_name, ct.subject_id, cs.curriculum_id FROM student_topic_progress stp JOIN curriculum_topics ct ON stp.topic_id = ct.id JOIN curriculum_subjects cs ON ct.subject_id = cs.id JOIN curriculums c ON cs.curriculum_id = c.id WHERE stp.student_id = ? ORDER BY c.name, cs.sort_order, ct.sort_order`, [req.params.studentId]);
    res.json(progress);
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.get('/progress/student/:studentId/topic/:topicId', authenticate, async (req, res) => {
  try {
    const { studentId, topicId } = req.params;
    let [progress] = await pool.query('SELECT * FROM student_topic_progress WHERE student_id = ? AND topic_id = ?', [studentId, topicId]);
    if (progress.length === 0) {
      const [student] = await pool.query('SELECT center_id FROM students WHERE id = ?', [studentId]);
      if (student.length === 0) { return res.status(404).json({ error: 'Student not found' }); }
      const [result] = await pool.query(`INSERT INTO student_topic_progress (student_id, topic_id, center_id, status) VALUES (?, ?, ?, 'not_started')`, [studentId, topicId, student[0].center_id]);
      [progress] = await pool.query('SELECT * FROM student_topic_progress WHERE id = ?', [result.insertId]);
    }
    res.json(progress[0]);
  } catch (error) {
    console.error('Get topic progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.put('/progress/student/:studentId/topic/:topicId', authenticate, authorize('developer', 'trainer_head', 'trainer'), async (req, res) => {
  try {
    const { studentId, topicId } = req.params;
    const { status, concept_understanding, application_of_knowledge, hands_on_skill, communication_skill, consistency, idea_generation, iteration_improvement, remarks } = req.body;
    let [existing] = await pool.query('SELECT id FROM student_topic_progress WHERE student_id = ? AND topic_id = ?', [studentId, topicId]);
    const completedAt = status === 'completed' ? new Date() : null;
    if (existing.length > 0) {
      await pool.query(`UPDATE student_topic_progress SET status = ?, concept_understanding = ?, application_of_knowledge = ?, hands_on_skill = ?, communication_skill = ?, consistency = ?, idea_generation = ?, iteration_improvement = ?, remarks = ?, trainer_id = ?, completed_at = ? WHERE student_id = ? AND topic_id = ?`, [status, concept_understanding, application_of_knowledge, hands_on_skill, communication_skill, consistency, idea_generation, iteration_improvement, remarks, req.user.id, completedAt, studentId, topicId]);
    } else {
      const [student] = await pool.query('SELECT center_id FROM students WHERE id = ?', [studentId]);
      await pool.query(`INSERT INTO student_topic_progress (student_id, topic_id, center_id, status, concept_understanding, application_of_knowledge, hands_on_skill, communication_skill, consistency, idea_generation, iteration_improvement, remarks, trainer_id, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [studentId, topicId, student[0].center_id, status, concept_understanding, application_of_knowledge, hands_on_skill, communication_skill, consistency, idea_generation, iteration_improvement, remarks, req.user.id, completedAt]);
    }
    const [updated] = await pool.query('SELECT * FROM student_topic_progress WHERE student_id = ? AND topic_id = ?', [studentId, topicId]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;
