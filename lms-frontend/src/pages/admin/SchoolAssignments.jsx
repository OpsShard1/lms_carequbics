import { useState, useEffect } from 'react';
import api from '../../api/axios';

const SchoolAssignments = () => {
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [principals, setPrincipals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState(''); // 'teacher' or 'principal'
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schoolsRes, teachersRes, principalsRes] = await Promise.all([
        api.get('/school-assignments'),
        api.get('/school-assignments/available-teachers'),
        api.get('/school-assignments/available-principals')
      ]);
      console.log('Schools:', schoolsRes.data);
      console.log('Teachers:', teachersRes.data);
      console.log('Principals:', principalsRes.data);
      setSchools(schoolsRes.data);
      setTeachers(teachersRes.data);
      setPrincipals(principalsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (school, type) => {
    setSelectedSchool(school);
    setAssignType(type);
    setSelectedUser('');
    setShowAssignModal(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await api.post('/school-assignments', {
        user_id: selectedUser,
        school_id: selectedSchool.id
      });
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create assignment');
    }
  };

  const handleRemove = async (assignmentId) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await api.delete(`/school-assignments/${assignmentId}`);
      loadData();
    } catch (err) {
      alert('Failed to remove assignment');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="school-assignments-page">
      <div className="page-header">
        <div>
          <h2>School Assignments</h2>
          <p className="subtitle">Assign teachers and principals to schools</p>
        </div>
      </div>

      {schools.length === 0 ? (
        <div className="no-data">
          <p>No schools found.</p>
        </div>
      ) : (
        <div className="schools-grid">
          {schools.map(school => (
            <div key={school.id} className="school-card">
              <div className="school-header">
                <h3>{school.name}</h3>
                <span className="school-location">{school.address}</span>
              </div>

              <div className="assignments-section">
                <div className="assignment-group">
                  <div className="group-header">
                    <h4>Principals</h4>
                    <button 
                      onClick={() => openAssignModal(school, 'principal')}
                      className="btn-sm btn-primary"
                    >
                      + Assign
                    </button>
                  </div>
                  {school.principals.length === 0 ? (
                    <p className="no-assignments">No principals assigned</p>
                  ) : (
                    <ul className="assignment-list">
                      {school.principals.map(principal => (
                        <li key={principal.id}>
                          <div className="user-info">
                            <span className="user-name">{principal.first_name} {principal.last_name}</span>
                            <span className="user-email">{principal.email}</span>
                          </div>
                          <button 
                            onClick={() => handleRemove(principal.id)}
                            className="btn-remove"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="assignment-group">
                  <div className="group-header">
                    <h4>Teachers</h4>
                    <button 
                      onClick={() => openAssignModal(school, 'teacher')}
                      className="btn-sm btn-primary"
                    >
                      + Assign
                    </button>
                  </div>
                  {school.teachers.length === 0 ? (
                    <p className="no-assignments">No teachers assigned</p>
                  ) : (
                    <ul className="assignment-list">
                      {school.teachers.map(teacher => (
                        <li key={teacher.id}>
                          <div className="user-info">
                            <span className="user-name">{teacher.first_name} {teacher.last_name}</span>
                            <span className="user-email">{teacher.email}</span>
                          </div>
                          <button 
                            onClick={() => handleRemove(teacher.id)}
                            className="btn-remove"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Assign {assignType === 'teacher' ? 'Teacher' : 'Principal'} to {selectedSchool.name}</h3>
            <form onSubmit={handleAssign}>
              <div className="form-group">
                <label>Select {assignType === 'teacher' ? 'Teacher' : 'Principal'}</label>
                <select 
                  value={selectedUser} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                >
                  <option value="">-- Choose --</option>
                  {(assignType === 'teacher' ? teachers : principals).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .school-assignments-page {
          padding: 16px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .schools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
          gap: 20px;
        }

        .school-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .school-header {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f1f5f9;
        }

        .school-header h3 {
          margin: 0 0 4px 0;
          color: #1a1a2e;
          font-size: 20px;
          font-weight: 700;
        }

        .school-location {
          color: #64748b;
          font-size: 14px;
        }

        .assignments-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .assignment-group {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
        }

        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .group-header h4 {
          margin: 0;
          color: #475569;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .no-assignments {
          color: #94a3b8;
          font-size: 14px;
          font-style: italic;
          margin: 0;
        }

        .assignment-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .assignment-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-name {
          font-weight: 600;
          color: #1a1a2e;
          font-size: 14px;
        }

        .user-email {
          color: #64748b;
          font-size: 12px;
        }

        .btn-remove {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-remove:hover {
          background: #fecaca;
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .schools-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SchoolAssignments;
