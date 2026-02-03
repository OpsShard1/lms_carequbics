import { useState, useEffect } from 'react';
import api from '../../api/axios';
import '../../styles/settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    school_section: true,
    center_section: true,
    school_dashboard: true,
    school_classes: true,
    school_students: true,
    school_curriculum: true,
    school_class_progress: true,
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
    admin_staff_assignments: true,
    admin_school_assignments: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.sidebar_visibility) {
        setSettings(prev => ({ ...prev, ...res.data.sidebar_visibility }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeSettings = async () => {
    try {
      await api.post('/settings/init');
      setMessage('Settings initialized successfully!');
      loadSettings();
    } catch (err) {
      setMessage('Failed to initialize settings');
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/settings/sidebar_visibility', { value: settings });
      setMessage('Settings saved successfully! Changes will apply on next page load.');
    } catch (err) {
      setMessage('Failed to save settings. Try initializing first.');
    } finally {
      setSaving(false);
    }
  };

  const settingGroups = [
    {
      title: 'Main Sections',
      description: 'Control visibility of School and Center sections for all users (except you)',
      items: [
        { key: 'school_section', label: 'School Section (entire section)' },
        { key: 'center_section', label: 'Center Section (entire section)' },
      ]
    },
    {
      title: 'School Menu Items',
      description: 'Control individual menu items in the School section',
      items: [
        { key: 'school_dashboard', label: 'Dashboard' },
        { key: 'school_classes', label: 'Classes' },
        { key: 'school_students', label: 'Students' },
        { key: 'school_curriculum', label: 'Curriculum' },
        { key: 'school_class_progress', label: 'Class Progress' },
        { key: 'school_timetable', label: 'Timetable' },
        { key: 'school_attendance', label: 'Attendance' },
      ]
    },
    {
      title: 'Center Menu Items',
      description: 'Control individual menu items in the Center section',
      items: [
        { key: 'center_dashboard', label: 'Dashboard' },
        { key: 'center_students', label: 'Students' },
        { key: 'center_attendance', label: 'Attendance' },
        { key: 'center_progress', label: 'Progress' },
        { key: 'center_curriculum', label: 'Curriculum' },
      ]
    },
    {
      title: 'Admin Menu Items',
      description: 'Control individual menu items in the Admin section',
      items: [
        { key: 'admin_users', label: 'Users' },
        { key: 'admin_schools', label: 'Schools' },
        { key: 'admin_centers', label: 'Centers' },
        { key: 'admin_staff_assignments', label: 'Staff Assignments' },
        { key: 'admin_school_assignments', label: 'School Assignments' },
      ]
    }
  ];

  if (loading) {
    return <div className="settings-page"><p>Loading settings...</p></div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>System Settings</h2>
        <p className="settings-note">
          These settings control what other users can see. As a developer, you always have full access.
        </p>
      </div>

      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="settings-actions">
        <button onClick={initializeSettings} className="btn-secondary">
          Initialize Settings Table
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-groups">
        {settingGroups.map(group => (
          <div key={group.title} className="settings-group">
            <h3>{group.title}</h3>
            <p className="group-description">{group.description}</p>
            <div className="settings-list">
              {group.items.map(item => (
                <div key={item.key} className="setting-item">
                  <label className="toggle-label">
                    <span className="setting-name">{item.label}</span>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings[item.key]}
                        onChange={() => handleToggle(item.key)}
                      />
                      <span className="slider"></span>
                    </div>
                    <span className={`status ${settings[item.key] ? 'on' : 'off'}`}>
                      {settings[item.key] ? 'Visible' : 'Hidden'}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;
