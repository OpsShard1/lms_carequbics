const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all settings (public for authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM app_settings');
    const settingsObj = {};
    settings.forEach(s => {
      try {
        settingsObj[s.setting_key] = JSON.parse(s.setting_value);
      } catch {
        settingsObj[s.setting_key] = s.setting_value;
      }
    });
    res.json(settingsObj);
  } catch (error) {
    // If table doesn't exist, return defaults
    res.json({
      sidebar_visibility: {
        school_section: true,
        center_section: true,
        school_dashboard: true,
        school_classes: true,
        school_students: true,
        school_timetable: true,
        school_attendance: true,
        center_dashboard: true,
        center_students: true,
        center_attendance: true,
        center_progress: true,
        center_curriculum: true,
        admin_users: true,
        admin_schools: true,
        admin_centers: true,
        admin_trainer_assignments: true,
        admin_teacher_assignments: true
      }
    });
  }
});

// Update settings (developer only)
router.put('/:key', authenticate, authorize('developer'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    // Upsert setting
    await pool.query(`
      INSERT INTO app_settings (setting_key, setting_value, updated_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?, updated_at = NOW()
    `, [key, valueStr, req.user.id, valueStr, req.user.id]);
    
    res.json({ message: 'Setting updated', key, value });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Initialize settings table if not exists
router.post('/init', authenticate, authorize('developer'), async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);
    
    // Insert default settings if not exist
    const defaultSettings = {
      sidebar_visibility: {
        school_section: true,
        center_section: true,
        school_dashboard: true,
        school_classes: true,
        school_students: true,
        school_timetable: true,
        school_attendance: true,
        center_dashboard: true,
        center_students: true,
        center_attendance: true,
        center_progress: true,
        center_curriculum: true,
        admin_users: true,
        admin_schools: true,
        admin_centers: true,
        admin_trainer_assignments: true,
        admin_teacher_assignments: true
      }
    };
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      await pool.query(`
        INSERT IGNORE INTO app_settings (setting_key, setting_value, updated_by)
        VALUES (?, ?, ?)
      `, [key, JSON.stringify(value), req.user.id]);
    }
    
    res.json({ message: 'Settings initialized' });
  } catch (error) {
    console.error('Init settings error:', error);
    res.status(500).json({ error: 'Failed to initialize settings' });
  }
});

module.exports = router;
