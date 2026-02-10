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
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '' });

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
            {centers.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.address || '-'}</td>
                <td>{c.contact_number || '-'}</td>
                <td>{c.email || '-'}</td>
                {canDelete && (
                  <td>
                    <button 
                      onClick={() => handleDelete(c.id, c.name)} 
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

export default AdminCenters;
