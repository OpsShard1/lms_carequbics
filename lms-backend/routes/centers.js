const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [centers] = await pool.query('SELECT * FROM centers WHERE is_active = true ORDER BY name');
    res.json(centers);
  } catch (error) {
    console.error('Get centers error:', error);
    res.status(500).json({ error: 'Failed to fetch centers' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [centers] = await pool.query('SELECT * FROM centers WHERE id = ?', [req.params.id]);
    if (centers.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.json(centers[0]);
  } catch (error) {
    console.error('Get center error:', error);
    res.status(500).json({ error: 'Failed to fetch center' });
  }
});

router.post('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const { name, address, contact_number, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Center name is required' });
    }
    const [result] = await pool.query(
      'INSERT INTO centers (name, address, contact_number, email) VALUES (?, ?, ?, ?)',
      [name, address, contact_number, email]
    );
    const [newCenter] = await pool.query('SELECT * FROM centers WHERE id = ?', [result.insertId]);
    res.status(201).json(newCenter[0]);
  } catch (error) {
    console.error('Create center error:', error);
    res.status(500).json({ error: 'Failed to create center' });
  }
});

router.put('/:id', authenticate, authorize('developer', 'owner'), async (req, res) => {
  try {
    const { name, address, contact_number, email, is_active } = req.body;
    await pool.query(
      'UPDATE centers SET name = ?, address = ?, contact_number = ?, email = ?, is_active = ? WHERE id = ?',
      [name, address, contact_number, email, is_active, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM centers WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update center error:', error);
    res.status(500).json({ error: 'Failed to update center' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner'), async (req, res) => {
  try {
    await pool.query('UPDATE centers SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'Center deleted successfully' });
  } catch (error) {
    console.error('Delete center error:', error);
    res.status(500).json({ error: 'Failed to delete center' });
  }
});

module.exports = router;
