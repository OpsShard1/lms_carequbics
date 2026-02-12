import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { useEditMode } from '../../hooks/useEditMode';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const AdminCenters = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const { canEdit, checkEdit } = useEditMode();
  const [centers, setCenters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAssignTrainerModal, setShowAssignTrainerModal] = useState(false);
  const [showAssignRegistrarModal, setShowAssignRegistrarModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [registrars, setRegistrars] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Only developer and owner can delete centers (and owner needs edit mode)
  const canDelete = ['developer', 'owner'].includes(user?.role_name) && canEdit;

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    const res = await api.get('/centers');
    setCenters(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkEdit()) return;
    
    try {
      await api.post('/centers', form);
      setShowModal(false);
      setForm({ name: '', address: '', contact_number: '', email: '' });
      loadCenters();
      showSuccess('Center created successfully!');
    } catch (err) {
      showError('Failed to create center: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (!checkEdit()) return;
    if (!confirm(`Are you sure you want to delete "${name}"? This will deactivate the center.`)) return;
    
    try {
      await api.delete(`/centers/${id}`);
      loadCenters();
      showSuccess('Center deleted successfully!');
    } catch (err) {
      showError('Failed to delete center: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCenterClick = async (center) => {
    setSelectedCenter(center);
    setShowAssignmentModal(true);
    await loadStaffAssignments(center.id);
    await loadStaff();
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/staff-assignments/staff');
      setTrainers(res.data.filter(s => s.role_name === 'trainer'));
      setRegistrars(res.data.filter(s => s.role_name === 'registrar'));
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  };

  const loadStaffAssignments = async (centerId) => {
    try {
      const res = await api.get('/staff-assignments');
      const centerStaff = res.data.filter(a => a.center_id === centerId);
      setStaffAssignments(centerStaff);
    } catch (err) {
      console.error('Failed to load staff assignments:', err);
      setStaffAssignments([]);
    }
  };

  const openAssignTrainerModal = () => {
    setSelectedUser(null);
    setShowAssignTrainerModal(true);
  };

  const openAssignRegistrarModal = () => {
    setSelectedUser(null);
    setShowAssignRegistrarModal(true);
  };

  const confirmAssignTrainer = async () => {
    if (!checkEdit() || !selectedUser) return;
    try {
      await api.post('/staff-assignments', {
        staff_id: selectedUser,
        school_id: null,
        center_id: selectedCenter.id
      });
      setShowAssignTrainerModal(false);
      setSelectedUser(null);
      await loadStaffAssignments(selectedCenter.id);
      showSuccess('Trainer assigned successfully!');
    } catch (err) {
      showError('Failed to assign trainer: ' + (err.response?.data?.error || err.message));
    }
  };

  const confirmAssignRegistrar = async () => {
    if (!checkEdit() || !selectedUser) return;
    try {
      await api.post('/staff-assignments', {
        staff_id: selectedUser,
        school_id: null,
        center_id: selectedCenter.id
      });
      setShowAssignRegistrarModal(false);
      setSelectedUser(null);
      await loadStaffAssignments(selectedCenter.id);
      showSuccess('Registrar assigned successfully!');
    } catch (err) {
      showError('Failed to assign registrar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUnassignStaff = async (assignmentId) => {
    if (!checkEdit()) return;
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
      await api.delete(`/staff-assignments/${assignmentId}`);
      await loadStaffAssignments(selectedCenter.id);
      showSuccess('Assignment removed successfully!');
    } catch (err) {
      showError('Failed to remove assignment: ' + (err.response?.data?.error || err.message));
    }
  };

  const getUnassignedTrainers = () => {
    const assignedIds = staffAssignments.map(a => a.staff_id);
    return trainers.filter(t => !assignedIds.includes(t.id));
  };

  const getUnassignedRegistrars = () => {
    const assignedIds = staffAssignments.map(a => a.staff_id);
    return registrars.filter(r => !assignedIds.includes(r.id));
  };

  const assignedTrainers = staffAssignments.filter(a => a.role_name === 'trainer');
  const assignedRegistrars = staffAssignments.filter(a => a.role_name === 'registrar');

  // Filter centers based on search term
  const filteredCenters = centers.filter(center => 
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (center.email && center.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="centers-page">
      <div className="page-header">
        <h2>Centers Management</h2>
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Add Center
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search centers by name or email..."
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
        title="Add New Center"
      >
        <form onSubmit={handleSubmit} className="form-card">
          <div className="info-box">
            <p><strong>Create Training Center</strong></p>
            <p>Add a new training center to the system for curriculum-based learning programs.</p>
          </div>
          
          <div>
            <label>Center Name <span className="required">*</span></label>
            <input placeholder="Enter center name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          </div>
          
          <div>
            <label>Address</label>
            <textarea placeholder="Enter center address" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
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
          
          <button type="submit" className="btn-primary">Create Center</button>
        </form>
      </Modal>

      <Modal 
        isOpen={showAssignmentModal} 
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedCenter(null);
        }} 
        title={`Manage Assignments - ${selectedCenter?.name}`}
      >
        <div className="assignments-container">
          <div className="info-box">
            <p><strong>Center Assignments</strong></p>
            <p>Assign trainers and registrars to {selectedCenter?.name}.</p>
          </div>

          {/* Assigned Trainers */}
          <div className="assignment-section">
            <h3>Assigned Trainers ({assignedTrainers.length})</h3>
            {assignedTrainers.length > 0 ? (
              <div className="assigned-list">
                {assignedTrainers.map(a => (
                  <div key={a.id} className="assigned-item">
                    <span>{a.staff_first_name} {a.staff_last_name} ({a.staff_email})</span>
                    {canEdit && (
                      <button 
                        onClick={() => handleUnassignStaff(a.id)} 
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

          {/* Assigned Registrars */}
          <div className="assignment-section">
            <h3>Assigned Registrars ({assignedRegistrars.length})</h3>
            {assignedRegistrars.length > 0 ? (
              <div className="assigned-list">
                {assignedRegistrars.map(a => (
                  <div key={a.id} className="assigned-item">
                    <span>{a.staff_first_name} {a.staff_last_name} ({a.staff_email})</span>
                    {canEdit && (
                      <button 
                        onClick={() => handleUnassignStaff(a.id)} 
                        className="btn-text btn-delete"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No registrars assigned yet.</p>
            )}
            
            {canEdit && getUnassignedRegistrars().length > 0 && (
              <button 
                onClick={openAssignRegistrarModal} 
                className="btn-primary"
                style={{ marginTop: '12px' }}
              >
                Assign Registrar
              </button>
            )}
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
              Assign to {selectedCenter?.name}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Assign Registrar Modal */}
      <Modal 
        isOpen={showAssignRegistrarModal} 
        onClose={() => {
          setShowAssignRegistrarModal(false);
          setSelectedUser(null);
        }} 
        title="Assign Registrar"
      >
        <div className="confirm-modal-content">
          <div className="form-group">
            <label>Select Registrar <span className="required">*</span></label>
            <select 
              value={selectedUser || ''} 
              onChange={(e) => setSelectedUser(parseInt(e.target.value))}
              required
            >
              <option value="">Choose a registrar...</option>
              {getUnassignedRegistrars().map(r => (
                <option key={r.id} value={r.id}>
                  {r.first_name} {r.last_name} ({r.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button 
              onClick={() => {
                setShowAssignRegistrarModal(false);
                setSelectedUser(null);
              }} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={confirmAssignRegistrar} 
              className="btn-primary"
              disabled={!selectedUser}
            >
              Assign to {selectedCenter?.name}
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
            {filteredCenters.length === 0 ? (
              <tr>
                <td colSpan={canDelete ? 5 : 4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  {searchTerm ? `No centers found matching "${searchTerm}"` : 'No centers available'}
                </td>
              </tr>
            ) : (
              filteredCenters.map(c => (
                <tr 
                  key={c.id}
                  onClick={() => handleCenterClick(c)}
                  className="clickable-row"
                >
                  <td>{c.name}</td>
                  <td>{c.address || '-'}</td>
                  <td>{c.contact_number || '-'}</td>
                  <td>{c.email || '-'}</td>
                  {canDelete && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDelete(c.id, c.name)} 
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

export default AdminCenters;
