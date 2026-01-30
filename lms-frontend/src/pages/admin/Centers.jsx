import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const AdminCenters = () => {
  const { user } = useAuth();
  const [centers, setCenters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '' });

  // Only developer and owner can delete centers
  const canDelete = ['developer', 'owner'].includes(user?.role_name);

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    const res = await api.get('/centers');
    setCenters(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/centers', form);
      setShowForm(false);
      setForm({ name: '', address: '', contact_number: '', email: '' });
      loadCenters();
      alert('Center created successfully!');
    } catch (err) {
      alert('Failed to create center: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will deactivate the center.`)) return;
    try {
      await api.delete(`/centers/${id}`);
      loadCenters();
      alert('Center deleted successfully!');
    } catch (err) {
      alert('Failed to delete center: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="centers-page">
      <div className="page-header">
        <h2>Centers Management</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Center'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <input placeholder="Center Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
          <div className="form-row">
            <input placeholder="Contact Number" value={form.contact_number} onChange={(e) => setForm({...form, contact_number: e.target.value})} />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          </div>
          <button type="submit" className="btn-primary">Create Center</button>
        </form>
      )}

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
