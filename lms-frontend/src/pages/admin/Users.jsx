import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role_id: '', section_type: 'school' });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const loadRoles = async () => {
    const res = await api.get('/users/roles');
    setRoles(res.data);
  };

  // Filter roles based on user permissions
  const getAvailableRoles = () => {
    if (user?.role_name === 'trainer_head') {
      // trainer_head can only create school_teacher and trainer
      return roles.filter(r => ['school_teacher', 'trainer'].includes(r.name));
    }
    return roles;
  };

  // Filter users based on permissions
  const getVisibleUsers = () => {
    if (user?.role_name === 'trainer_head') {
      // trainer_head can only see school_teacher and trainer users
      return users.filter(u => ['school_teacher', 'trainer'].includes(u.role_name));
    }
    return users;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setShowForm(false);
      setForm({ email: '', password: '', first_name: '', last_name: '', role_id: '', section_type: 'school' });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const availableRoles = getAvailableRoles();
  const visibleUsers = getVisibleUsers();

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>User Management</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-row">
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
          </div>
          <div className="form-row">
            <input placeholder="First Name" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
            <input placeholder="Last Name" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} />
          </div>
          <div className="form-row">
            <select value={form.role_id} onChange={(e) => setForm({...form, role_id: e.target.value})} required>
              <option value="">Select Role</option>
              {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={form.section_type} onChange={(e) => setForm({...form, section_type: e.target.value})}>
              <option value="school">School Only</option>
              <option value="center">Center Only</option>
              <option value="both">Both</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Create User</button>
        </form>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Section</th><th>Status</th></tr>
          </thead>
          <tbody>
            {visibleUsers.map(u => (
              <tr key={u.id}>
                <td>{u.first_name} {u.last_name}</td>
                <td>{u.email}</td>
                <td>{u.role_name}</td>
                <td>{u.section_type}</td>
                <td><span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
