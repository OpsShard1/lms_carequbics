import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { useEditMode } from '../../hooks/useEditMode';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const AdminSchools = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const { canEdit, checkEdit } = useEditMode();
  const [schools, setSchools] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [showAssignPrincipalModal, setShowAssignPrincipalModal] = useState(false);
  const [showAssignTrainerModal, setShowAssignTrainerModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [principals, setPrincipals] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [trainerAssignments, setTrainerAssignments] = useState([]);
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Only developer and owner can delete schools (and owner needs edit mode)
  const canDelete = ['developer', 'owner'].includes(user?.role_name) && canEdit;

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    const res = await api.get('/schools');
    setSchools(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkEdit()) return;
    
    try {
      await api.post('/schools', form);
      setShowModal(false);
      setForm({ name: '', address: '', contact_number: '', email: '' });
      loadSchools();
      showSuccess('School created successfully!');
    } catch (err) {
      showError('Failed to create school: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (!checkEdit()) return;
    if (!confirm(`Are you sure you want to delete "${name}"? This will deactivate the school.`)) return;
    
    try {
      await api.delete(`/schools/${id}`);
      loadSchools();
      showSuccess('School deleted successfully!');
    } catch (err) {
      showError('Failed to delete school: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSchoolClick = async (school) => {
    setSelectedSchool(school);
    setShowAssignmentModal(true);
    await loadAssignments(school.id);
    await loadTrainerAssignments(school.id);
    await loadUsers();
  };

  const loadUsers = async () => {
    try {
      const [usersRes, staffRes] = await Promise.all([
        api.get('/users'),
        api.get('/staff-assignments/staff')
      ]);
      const allUsers = usersRes.data;
      setTeachers(allUsers.filter(u => u.role_name === 'school_teacher'));
      setPrincipals(allUsers.filter(u => u.role_name === 'principal'));
      setTrainers(staffRes.data.filter(s => s.role_name === 'trainer'));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadAssignments = async (schoolId) => {
    try {
      const res = await api.get('/school-assignments');
      const schoolData = res.data.find(s => s.id === schoolId);
      if (schoolData) {
        const allAssignments = [
          ...schoolData.teachers.map(t => ({ ...t, role_name: 'school_teacher' })),
          ...schoolData.principals.map(p => ({ ...p, role_name: p.role_name }))
        ];
        setAssignments(allAssignments);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setAssignments([]);
    }
  };

  const openAssignTrainerModal = () => {
    setSelectedUser(null);
    setShowAssignTrainerModal(true);
  };

  const confirmAssignTrainer = async () => {
    if (!checkEdit() || !selectedUser) return;
    try {
      await api.post('/staff-assignments', {
        staff_id: selectedUser,
        school_id: selectedSchool.id,
        center_id: null
      });
      setShowAssignTrainerModal(false);
      setSelectedUser(null);
      await loadTrainerAssignments(selectedSchool.id);
      showSuccess('Trainer assigned successfully!');
    } catch (err) {
      showError('Failed to assign trainer: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUnassignTrainer = async (assignmentId) => {
    if (!checkEdit()) return;
    if (!confirm('Are you sure you want to remove this trainer assignment?')) return;
    
    try {
      await api.delete(`/staff-assignments/${assignmentId}`);
      await loadTrainerAssignments(selectedSchool.id);
      showSuccess('Trainer assignment removed successfully!');
    } catch (err) {
      showError('Failed to remove trainer assignment: ' + (err.response?.data?.error || err.message));
    }
  };

  const openAssignTeacherModal = () => {
    setSelectedUser(null);
    setShowAssignTeacherModal(true);
  };

  const openAssignPrincipalModal = () => {
    setSelectedUser(null);
    setShowAssignPrincipalModal(true);
  };

  const confirmAssignTeacher = async () => {
    if (!checkEdit() || !selectedUser) return;
    try {
      await api.post('/school-assignments', {
        user_id: selectedUser,
        school_id: selectedSchool.id
      });
      setShowAssignTeacherModal(false);
      setSelectedUser(null);
      await loadAssignments(selectedSchool.id);
      showSuccess('Teacher assigned successfully!');
    } catch (err) {
      showError('Failed to assign teacher: ' + (err.response?.data?.error || err.message));
    }
  };

  const confirmAssignPrincipal = async () => {
    if (!checkEdit() || !selectedUser) return;
    try {
      await api.post('/school-assignments', {
        user_id: selectedUser,
        school_id: selectedSchool.id
      });
      setShowAssignPrincipalModal(false);
      setSelectedUser(null);
      await loadAssignments(selectedSchool.id);
      showSuccess('Principal assigned successfully!');
    } catch (err) {
      showError('Failed to assign principal: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUnassign = async (assignmentId) => {
    if (!checkEdit()) return;
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
      await api.delete(`/school-assignments/${assignmentId}`);
      await loadAssignments(selectedSchool.id);
      showSuccess('Assignment removed successfully!');
    } catch (err) {
      showError('Failed to remove assignment: ' + (err.response?.data?.error || err.message));
    }
  };

  const loadTrainerAssignments = async (schoolId) => {
    try {
      const res = await api.get('/staff-assignments');
      const schoolTrainers = res.data.filter(a => a.school_id === schoolId);
      setTrainerAssignments(schoolTrainers);
    } catch (err) {
      console.error('Failed to load trainer assignments:', err);
      setTrainerAssignments([]);
    }
  };

  const getUnassignedTeachers = () => {
    const assignedIds = assignments.map(a => a.user_id);
    return teachers.filter(t => !assignedIds.includes(t.id));
  };

  const getUnassignedPrincipals = () => {
    const assignedIds = assignments.map(a => a.user_id);
    return principals.filter(p => !assignedIds.includes(p.id));
  };

  const getUnassignedTrainers = () => {
    const assignedIds = trainerAssignments.map(a => a.staff_id);
    return trainers.filter(t => !assignedIds.includes(t.id));
  };

  const assignedTeachers = assignments.filter(a => a.role_name === 'school_teacher');
  const assignedPrincipals = assignments.filter(a => a.role_name === 'principal');

  // Filter schools based on search term
  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (school.email && school.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="schools-page">
      <div className="page-header">
        <h2>Schools Management</h2>
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Add School
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search schools by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className="clear-search"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Add New School"
      >
        <form onSubmit={handleSubmit} className="form-card">
          <div className="info-box">
            <p><strong>Create School</strong></p>
            <p>Add a new school to the system for traditional class-based education programs.</p>
          </div>
          
          <div>
            <label>School Name <span className="required">*</span></label>
            <input placeholder="Enter school name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          </div>
          
          <div>
            <label>Address</label>
            <textarea placeholder="Enter school address" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
          </div>
          
          <div className="form-row">
            <div>
              <label>Contact Number</label>
              <input placeholder="Enter contact number" value={form.contact_number} onChange={(e) => setForm({...form, contact_number: e.target.value})} />
            </div>
            <div>
              <label>Email Address</label>
              <input placeholder="Enter email address" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          
          <button type="submit" className="btn-primary">Create School</button>
        </form>
      </Modal>

      <Modal 
        isOpen={showAssignmentModal} 
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedSchool(null);
        }} 
        title={`Manage Assignments - ${selectedSchool?.name}`}
      >
        <div className="assignments-container">
          <div className="info-box">
            <p><strong>School Assignments</strong></p>
            <p>Assign teachers and principals to {selectedSchool?.name}.</p>
          </div>

          {/* Assigned Teachers */}
          <div className="assignment-section">
            <h3>Assigned Teachers ({assignedTeachers.length})</h3>
            {assignedTeachers.length > 0 ? (
              <div className="assigned-list">
                {assignedTeachers.map(a => (
                  <div key={a.id} className="assigned-item">
                    <span>{a.first_name} {a.last_name} ({a.email})</span>
                    {canEdit && (
                      <button 
                        onClick={() => handleUnassign(a.id)} 
                        className="btn-text btn-delete"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No teachers assigned yet.</p>
            )}
            
            {canEdit && getUnassignedTeachers().length > 0 && (
              <button 
                onClick={openAssignTeacherModal} 
                className="btn-primary"
                style={{ marginTop: '12px' }}
              >
                Assign Teacher
              </button>
            )}
          </div>

          {/* Assigned Principals */}
          <div className="assignment-section">
            <h3>Assigned Principals ({assignedPrincipals.length})</h3>
            {assignedPrincipals.length > 0 ? (
              <div className="assigned-list">
                {assignedPrincipals.map(a => (
                  <div key={a.id} className="assigned-item">
                    <span>{a.first_name} {a.last_name} ({a.email})</span>
                    {canEdit && (
                      <button 
                        onClick={() => handleUnassign(a.id)} 
                        className="btn-text btn-delete"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No principals assigned yet.</p>
            )}
            
            {canEdit && getUnassignedPrincipals().length > 0 && (
              <button 
                onClick={openAssignPrincipalModal} 
                className="btn-primary"
                style={{ marginTop: '12px' }}
              >
                Assign Principal
              </button>
            )}
          </div>

          {/* Assigned Trainers */}
          <div className="assignment-section">
            <h3>Assigned Trainers ({trainerAssignments.length})</h3>
            {trainerAssignments.length > 0 ? (
              <div className="assigned-list">
                {trainerAssignments.map(a => (
                  <div key={a.id} className="assigned-item">
                    <span>{a.staff_first_name} {a.staff_last_name} ({a.staff_email})</span>
                    {canEdit && (
                      <button 
                        onClick={() => handleUnassignTrainer(a.id)} 
                        className="btn-text btn-delete"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No trainers assigned yet.</p>
            )}
            
            {canEdit && getUnassignedTrainers().length > 0 && (
              <button 
                onClick={openAssignTrainerModal} 
                className="btn-primary"
                style={{ marginTop: '12px' }}
              >
                Assign Trainer
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm Assign Teacher Modal */}
      <Modal 
        isOpen={showAssignTeacherModal} 
        onClose={() => {
          setShowAssignTeacherModal(false);
          setSelectedUser(null);
        }} 
        title="Assign Teacher"
      >
        <div className="confirm-modal-content">
          <div className="form-group">
            <label>Select Teacher <span className="required">*</span></label>
            <select 
              value={selectedUser || ''} 
              onChange={(e) => setSelectedUser(parseInt(e.target.value))}
              required
            >
              <option value="">Choose a teacher...</option>
              {getUnassignedTeachers().map(t => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button 
              onClick={() => {
                setShowAssignTeacherModal(false);
                setSelectedUser(null);
              }} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={confirmAssignTeacher} 
              className="btn-primary"
              disabled={!selectedUser}
            >
              Assign to {selectedSchool?.name}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Assign Principal Modal */}
      <Modal 
        isOpen={showAssignPrincipalModal} 
        onClose={() => {
          setShowAssignPrincipalModal(false);
          setSelectedUser(null);
        }} 
        title="Assign Principal"
      >
        <div className="confirm-modal-content">
          <div className="form-group">
            <label>Select Principal <span className="required">*</span></label>
            <select 
              value={selectedUser || ''} 
              onChange={(e) => setSelectedUser(parseInt(e.target.value))}
              required
            >
              <option value="">Choose a principal...</option>
              {getUnassignedPrincipals().map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button 
              onClick={() => {
                setShowAssignPrincipalModal(false);
                setSelectedUser(null);
              }} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={confirmAssignPrincipal} 
              className="btn-primary"
              disabled={!selectedUser}
            >
              Assign to {selectedSchool?.name}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Assign Trainer Modal */}
      <Modal 
        isOpen={showAssignTrainerModal} 
        onClose={() => {
          setShowAssignTrainerModal(false);
          setSelectedUser(null);
        }} 
        title="Assign Trainer"
      >
        <div className="confirm-modal-content">
          <div className="form-group">
            <label>Select Trainer <span className="required">*</span></label>
            <select 
              value={selectedUser || ''} 
              onChange={(e) => setSelectedUser(parseInt(e.target.value))}
              required
            >
              <option value="">Choose a trainer...</option>
              {getUnassignedTrainers().map(t => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button 
              onClick={() => {
                setShowAssignTrainerModal(false);
                setSelectedUser(null);
              }} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={confirmAssignTrainer} 
              className="btn-primary"
              disabled={!selectedUser}
            >
              Assign to {selectedSchool?.name}
            </button>
          </div>
        </div>
      </Modal>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Contact</th>
              <th>Email</th>
              {canDelete && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan={canDelete ? 5 : 4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  {searchTerm ? `No schools found matching "${searchTerm}"` : 'No schools available'}
                </td>
              </tr>
            ) : (
              filteredSchools.map(s => (
                <tr 
                  key={s.id} 
                  onClick={() => handleSchoolClick(s)}
                  className="clickable-row"
                >
                  <td>{s.name}</td>
                  <td>{s.address || '-'}</td>
                  <td>{s.contact_number || '-'}</td>
                  <td>{s.email || '-'}</td>
                  {canDelete && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDelete(s.id, s.name)} 
                        className="btn-text btn-delete"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSchools;
