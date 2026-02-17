const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all issues (for admin, owner, trainer_head)
router.get('/issues', authenticate, authorize('developer', 'super_admin', 'admin', 'owner', 'trainer_head'), async (req, res) => {
  try {
    // First, auto-delete resolved issues older than 10 days
    await pool.query(`
      DELETE FROM help_issues 
      WHERE is_resolved = true 
      AND resolved_at < DATE_SUB(NOW(), INTERVAL 10 DAY)
    `);
    
    // Then fetch all remaining issues (both resolved and unresolved)
    const [issues] = await pool.query(`
      SELECT i.*, u.first_name, u.last_name, u.email, u.role_name,
             r.first_name as resolver_first_name, r.last_name as resolver_last_name
      FROM help_issues i
      LEFT JOIN (
        SELECT id, first_name, last_name, email, 
               (SELECT name FROM roles WHERE id = users.role_id) as role_name
        FROM users
      ) u ON i.reported_by = u.id
      LEFT JOIN users r ON i.resolved_by = r.id
      ORDER BY i.is_resolved ASC, i.created_at DESC
    `);
    res.json(issues);
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Report an issue
router.post('/issues', authenticate, async (req, res) => {
  try {
    const { section, subsections, title, description } = req.body;
    
    if (!section || !title || !description) {
      return res.status(400).json({ error: 'Section, title, and description are required' });
    }
    
    const [result] = await pool.query(`
      INSERT INTO help_issues (section, subsections, title, description, reported_by, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [section, subsections || null, title, description, req.user.id]);
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Issue reported successfully' 
    });
  } catch (error) {
    console.error('Report issue error:', error);
    res.status(500).json({ error: 'Failed to report issue' });
  }
});

// Mark issue as resolved
router.put('/issues/:id/resolve', authenticate, authorize('developer', 'super_admin', 'admin', 'owner', 'trainer_head'), async (req, res) => {
  try {
    await pool.query(`
      UPDATE help_issues 
      SET is_resolved = true, resolved_at = NOW(), resolved_by = ?
      WHERE id = ?
    `, [req.user.id, req.params.id]);
    
    res.json({ message: 'Issue marked as resolved' });
  } catch (error) {
    console.error('Resolve issue error:', error);
    res.status(500).json({ error: 'Failed to resolve issue' });
  }
});

// Delete resolved issue (admin only)
router.delete('/issues/:id', authenticate, authorize('developer', 'super_admin', 'admin', 'owner'), async (req, res) => {
  try {
    await pool.query('DELETE FROM help_issues WHERE id = ?', [req.params.id]);
    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// Auto-delete resolved issues older than 10 days (cron job endpoint)
router.post('/issues/cleanup', authenticate, authorize('developer', 'super_admin'), async (req, res) => {
  try {
    const [result] = await pool.query(`
      DELETE FROM help_issues 
      WHERE is_resolved = true 
      AND resolved_at < DATE_SUB(NOW(), INTERVAL 10 DAY)
    `);
    
    res.json({ 
      message: 'Cleanup completed', 
      deleted: result.affectedRows 
    });
  } catch (error) {
    console.error('Cleanup issues error:', error);
    res.status(500).json({ error: 'Failed to cleanup issues' });
  }
});

module.exports = router;
