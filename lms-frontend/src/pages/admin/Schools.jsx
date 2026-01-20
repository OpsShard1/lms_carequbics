import { useState, useEffect } from 'react';
import api from '../../api/axios';

const AdminSchools = () => {
  const [schools, setSchools] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '' });

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    const res = await api.get('/schools');
    setSchools(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/schools', form);
    setShowForm(false);
    setForm({ name: '', address: '', contact_number: '', email: '' });
    loadSchools();
  };

  return (
    <div className="schools-page">
      <div className="page-header">
        <h2>Schools Management</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add School'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <input placeholder="School Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
          <div className="form-row">
            <input placeholder="Contact Number" value={form.contact_number} onChange={(e) => setForm({...form, contact_number: e.target.value})} />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          </div>
          <button type="submit" className="btn-primary">Create School</button>
        </form>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Address</th><th>Contact</th><th>Email</th></tr>
          </thead>
          <tbody>
            {schools.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.address || '-'}</td>
                <td>{s.contact_number || '-'}</td>
                <td>{s.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSchools;
