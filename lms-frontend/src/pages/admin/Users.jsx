import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { useEditMode } from '../../hooks/useEditMode';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const AdminUsers = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const { canEdit, checkEdit } = useEditMode();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role_id: '', section_type: 'school', is_active: true });
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user can delete/deactivate
  const canManageUsers = ['developer', 'owner', 'super_admin'].includes(user?.role_name) && canEdit;

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
    let filteredUsers = users;
    
    // Filter by role permissions
    if (user?.role_name === 'trainer_head') {
      // trainer_head can only see school_teacher and trainer users
      filteredUsers = filteredUsers.filter(u => ['school_teacher', 'trainer'].includes(u.role_name));
    }
    
    // Filter by search term
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(u => 
        u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Show all users including deactivated ones (deleted users are removed from DB)
    return filteredUsers;
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
    if (!checkEdit()) return;
    
    try {
      if (editingUser) {
        // Update existing user
        const updateData = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role_id: form.role_id,
          section_type: form.section_type,
          is_active: form.is_active
        };
        await api.put(`/users/${editingUser.id}`, updateData);
        showSuccess('User updated successfully!');
      } else {
        // Create new user
        await api.post('/users', form);
        showSuccess('User created successfully!');
      }
      
      setShowModal(false);
      setEditingUser(null);
      setForm({ email: '', password: '', first_name: '', last_name: '', role_id: '', section_type: 'school', is_active: true });
      loadUsers();
    } catch (err) {
      showError(err.response?.data?.error || `Failed to ${editingUser ? 'update' : 'create'} user`);
    }
  };

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setForm({
      email: userToEdit.email,
      password: '', // Don't populate password for security
      first_name: userToEdit.first_name,
      last_name: userToEdit.last_name || '',
      role_id: userToEdit.role_id,
      section_type: userToEdit.section_type,
      is_active: userToEdit.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (userId, userName) => {
    if (!checkEdit()) return;
    if (!window.confirm(`Are you sure you want to delete ${userName}? This will permanently deactivate their account.`)) return;
    
    try {
      await api.delete(`/users/${userId}`);
      loadUsers();
      showSuccess('User deleted successfully!');
    } catch (err) {
      showError('Failed to delete user');
    }
  };

  const handleToggleActive = async (userId, currentStatus, userName) => {
    if (!checkEdit()) return;
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${userName}?`)) return;
    
    try {
      // Only send is_active field to avoid foreign key issues
      await api.put(`/users/${userId}`, { 
        is_active: !currentStatus 
      });
      loadUsers();
      showSuccess(`User ${action}d successfully!`);
    } catch (err) {
      showError(`Failed to ${action} user`);
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
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Add User
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search users by name or email..."
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
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
          setForm({ email: '', password: '', first_name: '', last_name: '', role_id: '', section_type: 'school', is_active: true });
        }} 
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="form-card">
          <div className="info-box">
            <p><strong>{editingUser ? 'Update User Account' : 'Create User Account'}</strong></p>
            <p>{editingUser ? 'Update user information and permissions.' : 'Add a new user to the system with appropriate role and section access.'}</p>
          </div>
          
          <div className="form-row">
            <div>
              <label>Email Address <span className="required">*</span></label>
              <input placeholder="Enter email address" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label>Password {!editingUser && <span className="required">*</span>}</label>
              <input 
                placeholder={editingUser ? "Leave blank to keep current" : "Enter password"} 
                type="password" 
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
                required={!editingUser} 
              />
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
          
          {editingUser && canManageUsers && (
            <div className="form-row">
              <div>
                <label>Account Status</label>
                <select value={form.is_active ? '1' : '0'} onChange={(e) => setForm({...form, is_active: e.target.value === '1'})}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
          )}
          
          <button type="submit" className="btn-primary">{editingUser ? 'Update User' : 'Create User'}</button>
        </form>
      </Modal>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Section</th>
              <th>Status</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  {searchTerm ? `No users found matching "${searchTerm}"` : 'No users available'}
                </td>
              </tr>
            ) : (
              visibleUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td>{u.role_name}</td>
                  <td>{u.section_type}</td>
                  <td>
                  {canManageUsers ? (
                    <span 
                      className={`status-badge ${u.is_active ? 'active' : 'inactive'} clickable`}
                      onClick={() => handleToggleActive(u.id, u.is_active, `${u.first_name} ${u.last_name}`)}
                      title={u.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  ) : (
                    <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleEdit(u)} 
                        className="btn-text btn-edit"
                      >
                        Edit
                      </button>
                      {canManageUsers && (
                        <button 
                          onClick={() => handleDelete(u.id, `${u.first_name} ${u.last_name}`)} 
                          className="btn-text btn-delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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

export default AdminUsers;
