import { useState, useEffect } from 'react';
import { useNotificationContext } from '../../context/NotificationContext';
import { useEditMode } from '../../hooks/useEditMode';
import api from '../../api/axios';
import '../../styles/classes.css';

const StaffAssignments = () => {
  const { showSuccess, showError } = useNotificationContext();
  const { canEdit, checkEdit } = useEditMode();
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [schools, setSchools] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    assignment_type: 'center',
    school_id: '',
    center_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsRes, staffRes, schoolsRes, centersRes] = await Promise.all([
        api.get('/staff-assignments'),
        api.get('/staff-assignments/staff'),
        api.get('/schools'),
        api.get('/centers')
      ]);
      setAssignments(assignmentsRes.data);
      setStaff(staffRes.data);
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
    if (!checkEdit()) return;
    
    try {
      const payload = {
        staff_id: formData.staff_id,
        school_id: formData.assignment_type === 'school' ? formData.school_id : null,
        center_id: formData.assignment_type === 'center' ? formData.center_id : null
      };
      
      await api.post('/staff-assignments', payload);
      setShowForm(false);
      setFormData({ staff_id: '', assignment_type: 'center', school_id: '', center_id: '' });
      loadData();
      showSuccess('Assignment created successfully!');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to create assignment');
    }
  };

  const handleDelete = async (id) => {
    if (!checkEdit()) return;
    if (!confirm('Remove this assignment?')) return;
    
    try {
      await api.delete(`/staff-assignments/${id}`);
      loadData();
      showSuccess('Assignment removed successfully!');
    } catch (err) {
      showError('Failed to remove assignment');
    }
  };

  // Get selected staff member's role
  const getSelectedStaffRole = () => {
    const selectedStaff = staff.find(s => s.id === parseInt(formData.staff_id));
    return selectedStaff?.role_name;
  };

  // Group assignments by staff member
  const groupedAssignments = staff.map(member => ({
    staff: member,
    schoolAssignments: assignments.filter(a => a.staff_id === member.id && a.school_id),
    centerAssignments: assignments.filter(a => a.staff_id === member.id && a.center_id)
  })).filter(g => g.schoolAssignments.length > 0 || g.centerAssignments.length > 0);

  if (loading) return <p>Loading...</p>;

  const selectedRole = getSelectedStaffRole();
  const isRegistrar = selectedRole === 'registrar';

  return (
    <div className="classes-page">
      <div className="page-header">
        <div>
          <h2>Staff Assignments</h2>
          <p className="subtitle">Assign trainers and registrars to schools and centers. Trainer heads automatically get access based on their section type.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + New Assignment
          </button>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Assign Staff Member</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Staff Member</label>
                <select 
                  value={formData.staff_id} 
                  onChange={(e) => setFormData({...formData, staff_id: e.target.value, assignment_type: 'center', school_id: '', center_id: ''})}
                  required
                >
                  <option value="">Select Staff Member</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.role_name}) - {s.email}
                    </option>
                  ))}
                </select>
              </div>

              {!isRegistrar && (
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
              )}

              {isRegistrar && (
                <div className="form-group">
                  <p style={{color: '#64748b', fontSize: '0.9rem', margin: '0.5rem 0'}}>
                    Registrars can only be assigned to centers
                  </p>
                </div>
              )}

              {(!isRegistrar && formData.assignment_type === 'school') ? (
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
          <p>No staff assignments yet.</p>
          <p className="hint">Click "New Assignment" to assign staff members to schools or centers.</p>
        </div>
      ) : (
        <div className="assignments-list">
          {groupedAssignments.map(({ staff: member, schoolAssignments, centerAssignments }) => (
            <div key={member.id} className="trainer-card">
              <div className="trainer-header">
                <div>
                  <h3>👤 {member.first_name} {member.last_name}</h3>
                  <span className="trainer-role">{member.role_name}</span>
                </div>
                <span className="trainer-email">{member.email}</span>
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
        .trainer-header h3 { margin: 0 0 0.25rem; color: #1a1a2e; }
        .trainer-role { 
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
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

export default StaffAssignments;
