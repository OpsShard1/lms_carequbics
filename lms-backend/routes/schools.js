const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [schools] = await pool.query('SELECT * FROM schools WHERE is_active = true ORDER BY name');
    res.json(schools);
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [schools] = await pool.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
    if (schools.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json(schools[0]);
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

router.post('/', authenticate, authorize('developer', 'owner', 'trainer_head'), async (req, res) => {
  try {
    const { name, address, contact_number, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }
    const [result] = await pool.query(
      'INSERT INTO schools (name, address, contact_number, email) VALUES (?, ?, ?, ?)',
      [name, address, contact_number, email]
    );
    const [newSchool] = await pool.query('SELECT * FROM schools WHERE id = ?', [result.insertId]);
    res.status(201).json(newSchool[0]);
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

router.put('/:id', authenticate, authorize('developer', 'owner'), async (req, res) => {
  try {
    const { name, address, contact_number, email, is_active } = req.body;
    await pool.query(
      'UPDATE schools SET name = ?, address = ?, contact_number = ?, email = ?, is_active = ? WHERE id = ?',
      [name, address, contact_number, email, is_active, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

router.delete('/:id', authenticate, authorize('developer', 'owner'), async (req, res) => {
  try {
    await pool.query('UPDATE schools SET is_active = false WHERE id = ?', [req.params.id]);
    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

module.exports = router;
