import { useState, useEffect } from 'react';
import api from '../../api/axios';
import '../../styles/classes.css';

const TeacherAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    teacher_id: '',
    school_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsRes, teachersRes, schoolsRes] = await Promise.all([
        api.get('/teacher-assignments'),
        api.get('/teacher-assignments/teachers'),
        api.get('/schools')
      ]);
      setAssignments(assignmentsRes.data);
      setTeachers(teachersRes.data);
      setSchools(schoolsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teacher-assignments', formData);
      setShowForm(false);
      setFormData({ teacher_id: '', school_id: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create assignment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await api.delete(`/teacher-assignments/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to remove assignment');
    }
  };

  // Group assignments by teacher
  const groupedAssignments = teachers.map(teacher => ({
    teacher,
    schoolAssignments: assignments.filter(a => a.user_id === teacher.id)
  })).filter(g => g.schoolAssignments.length > 0);

  // Teachers without assignments
  const unassignedTeachers = teachers.filter(t => 
    !assignments.some(a => a.user_id === t.id)
  );

  if (loading) return <p>Loading...</p>;

  return (
    <div className="classes-page">
      <div className="page-header">
        <div>
          <h2>Teacher Assignments</h2>
          <p className="subtitle">Assign school teachers to their schools</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New Assignment
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Assign Teacher to School</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Teacher</label>
                <select 
                  value={formData.teacher_id} 
                  onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>School</label>
                <select 
                  value={formData.school_id} 
                  onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                  required
                >
                  <option value="">Select School</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {unassignedTeachers.length > 0 && (
        <div className="warning-box" style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <strong>⚠️ Unassigned Teachers:</strong> {unassignedTeachers.map(t => `${t.first_name} ${t.last_name}`).join(', ')}
        </div>
      )}

      {groupedAssignments.length === 0 ? (
        <div className="no-data">
          <p>No teacher assignments yet.</p>
          <p className="hint">Click "New Assignment" to assign teachers to schools.</p>
        </div>
      ) : (
        <div className="assignments-list">
          {groupedAssignments.map(({ teacher, schoolAssignments }) => (
            <div key={teacher.id} className="trainer-card">
              <div className="trainer-header">
                <h3>👩‍🏫 {teacher.first_name} {teacher.last_name}</h3>
                <span className="trainer-email">{teacher.email}</span>
              </div>
              
              <div className="assignments-grid">
                <div className="assignment-section">
                  <h4>🏫 Assigned Schools</h4>
                  <ul>
                    {schoolAssignments.map(a => (
                      <li key={a.id}>
                        {a.school_name}
                        <button onClick={() => handleDelete(a.id)} className="btn-sm btn-danger">×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .trainer-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .trainer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .trainer-header h3 { margin: 0; color: #1a1a2e; }
        .trainer-email { color: #64748b; font-size: 0.9rem; }
        .assignments-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        .assignment-section h4 { margin: 0 0 0.75rem; color: #64748b; font-size: 0.9rem; }
        .assignment-section ul { list-style: none; padding: 0; margin: 0; }
        .assignment-section li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .assignment-section li .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
      `}</style>
    </div>
  );
};

export default TeacherAssignments;
