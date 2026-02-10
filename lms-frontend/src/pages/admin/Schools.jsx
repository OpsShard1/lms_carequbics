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
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '' });

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
            {schools.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.address || '-'}</td>
                <td>{s.contact_number || '-'}</td>
                <td>{s.email || '-'}</td>
                {canDelete && (
                  <td>
                    <button 
                      onClick={() => handleDelete(s.id, s.name)} 
                      className="btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSchools;
