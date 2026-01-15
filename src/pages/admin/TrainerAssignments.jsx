import { useState, useEffect } from 'react';
import api from '../../api/axios';
import '../../styles/classes.css';

const TrainerAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    trainer_id: '',
    assignment_type: 'school',
    school_id: '',
    center_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsRes, trainersRes, schoolsRes, centersRes] = await Promise.all([
        api.get('/trainer-assignments'),
        api.get('/trainer-assignments/trainers'),
        api.get('/schools'),
        api.get('/centers')
      ]);
      setAssignments(assignmentsRes.data);
      setTrainers(trainersRes.data);
      setSchools(schoolsRes.data);
      setCenters(centersRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        trainer_id: formData.trainer_id,
        school_id: formData.assignment_type === 'school' ? formData.school_id : null,
        center_id: formData.assignment_type === 'center' ? formData.center_id : null
      };
      
      await api.post('/trainer-assignments', payload);
      setShowForm(false);
      setFormData({ trainer_id: '', assignment_type: 'school', school_id: '', center_id: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create assignment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await api.delete(`/trainer-assignments/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to remove assignment');
    }
  };

  // Group assignments by trainer
  const groupedAssignments = trainers.map(trainer => ({
    trainer,
    schoolAssignments: assignments.filter(a => a.trainer_id === trainer.id && a.school_id),
    centerAssignments: assignments.filter(a => a.trainer_id === trainer.id && a.center_id)
  })).filter(g => g.schoolAssignments.length > 0 || g.centerAssignments.length > 0);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="classes-page">
      <div className="page-header">
        <div>
          <h2>Trainer Assignments</h2>
          <p className="subtitle">Assign trainers to schools and centers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New Assignment
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Assign Trainer</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Trainer</label>
                <select 
                  value={formData.trainer_id} 
                  onChange={(e) => setFormData({...formData, trainer_id: e.target.value})}
                  required
                >
                  <option value="">Select Trainer</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assignment Type</label>
                <select 
                  value={formData.assignment_type} 
                  onChange={(e) => setFormData({...formData, assignment_type: e.target.value, school_id: '', center_id: ''})}
                >
                  <option value="school">School</option>
                  <option value="center">Center</option>
                </select>
              </div>

              {formData.assignment_type === 'school' ? (
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
              ) : (
                <div className="form-group">
                  <label>Center</label>
                  <select 
                    value={formData.center_id} 
                    onChange={(e) => setFormData({...formData, center_id: e.target.value})}
                    required
                  >
                    <option value="">Select Center</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {groupedAssignments.length === 0 ? (
        <div className="no-data">
          <p>No trainer assignments yet.</p>
          <p className="hint">Click "New Assignment" to assign trainers to schools or centers.</p>
        </div>
      ) : (
        <div className="assignments-list">
          {groupedAssignments.map(({ trainer, schoolAssignments, centerAssignments }) => (
            <div key={trainer.id} className="trainer-card">
              <div className="trainer-header">
                <h3>👤 {trainer.first_name} {trainer.last_name}</h3>
                <span className="trainer-email">{trainer.email}</span>
              </div>
              
              <div className="assignments-grid">
                {schoolAssignments.length > 0 && (
                  <div className="assignment-section">
                    <h4>🏫 Schools</h4>
                    <ul>
                      {schoolAssignments.map(a => (
                        <li key={a.id}>
                          {a.school_name}
                          <button onClick={() => handleDelete(a.id)} className="btn-sm btn-danger">×</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {centerAssignments.length > 0 && (
                  <div className="assignment-section">
                    <h4>🎓 Centers</h4>
                    <ul>
                      {centerAssignments.map(a => (
                        <li key={a.id}>
                          {a.center_name}
                          <button onClick={() => handleDelete(a.id)} className="btn-sm btn-danger">×</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
        .assignments-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
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
        @media (max-width: 600px) {
          .assignments-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default TrainerAssignments;
