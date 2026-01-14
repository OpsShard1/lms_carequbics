import { useState, useEffect } from 'react';
import api from '../../api/axios';

const AdminCenters = () => {
  const [centers, setCenters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '' });

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    const res = await api.get('/centers');
    setCenters(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/centers', form);
    setShowForm(false);
    setForm({ name: '', address: '', contact_number: '', email: '' });
    loadCenters();
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

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Address</th><th>Contact</th><th>Email</th></tr>
        </thead>
        <tbody>
          {centers.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.address || '-'}</td>
              <td>{c.contact_number || '-'}</td>
              <td>{c.email || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminCenters;
