import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const AdminUsers = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
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

  // Get default section type based on role name
  const getDefaultSectionType = (roleName) => {
    const sectionDefaults = {
      'developer': 'both',
      'owner': 'both',
      'school_teacher': 'school',
      'principal': 'school',
      'registrar': 'center',
      'trainer': 'both',
      'trainer_head': 'both'
    };
    return sectionDefaults[roleName] || 'school';
  };

  // Check if section type should be editable for the selected role
  const isSectionTypeEditable = (roleName) => {
    // Only trainer and trainer_head can have their section type changed
    return ['trainer', 'trainer_head'].includes(roleName);
  };

  // Handle role change and auto-set section type
  const handleRoleChange = (roleId) => {
    const selectedRole = roles.find(r => r.id === parseInt(roleId));
    const roleName = selectedRole?.name || '';
    const defaultSectionType = getDefaultSectionType(roleName);
    
    setForm({
      ...form,
      role_id: roleId,
      section_type: defaultSectionType
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setShowModal(false);
      setForm({ email: '', password: '', first_name: '', last_name: '', role_id: '', section_type: 'school' });
      loadUsers();
      showSuccess('User created successfully!');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to create user');
    }
  };

  // Get the selected role name
  const getSelectedRoleName = () => {
    if (!form.role_id) return '';
    const selectedRole = roles.find(r => r.id === parseInt(form.role_id));
    return selectedRole?.name || '';
  };

  const availableRoles = getAvailableRoles();
  const visibleUsers = getVisibleUsers();
  const selectedRoleName = getSelectedRoleName();
  const showSectionTypeSelector = selectedRoleName && isSectionTypeEditable(selectedRoleName);

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>User Management</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          Add User
        </button>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Add New User"
      >
        <form onSubmit={handleSubmit} className="form-card">
          <div className="info-box">
            <p><strong>Create User Account</strong></p>
            <p>Add a new user to the system with appropriate role and section access.</p>
          </div>
          
          <div className="form-row">
            <div>
              <label>Email Address <span className="required">*</span></label>
              <input placeholder="Enter email address" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label>Password <span className="required">*</span></label>
              <input placeholder="Enter password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
            </div>
          </div>
          
          <div className="form-row">
            <div>
              <label>First Name <span className="required">*</span></label>
              <input placeholder="Enter first name" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
            </div>
            <div>
              <label>Last Name</label>
              <input placeholder="Enter last name" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} />
            </div>
          </div>
          
          <div className="form-row">
            <div>
              <label>Role <span className="required">*</span></label>
              <select value={form.role_id} onChange={(e) => handleRoleChange(e.target.value)} required>
                <option value="">Select Role</option>
                {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {showSectionTypeSelector ? (
              <div>
                <label>Section Access</label>
                <select value={form.section_type} onChange={(e) => setForm({...form, section_type: e.target.value})}>
                  <option value="school">School Only</option>
                  <option value="center">Center Only</option>
                  <option value="both">Both</option>
                </select>
              </div>
            ) : selectedRoleName && (
              <div>
                <label>Section Access</label>
                <input 
                  type="text" 
                  value={form.section_type.charAt(0).toUpperCase() + form.section_type.slice(1)} 
                  disabled 
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', color: '#666' }}
                />
              </div>
            )}
          </div>
          
          <button type="submit" className="btn-primary">Create User</button>
        </form>
      </Modal>

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
