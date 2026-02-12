import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { useEditMode } from '../../hooks/useEditMode';
import { useNavigate } from 'react-router-dom';
import DatePicker from '../../components/DatePicker';
import api from '../../api/axios';
import '../../styles/student-registration.css';

const CenterStudents = () => {
  const { selectedCenter, user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const { canEdit, checkEdit } = useEditMode();
  const navigate = useNavigate();
  const canChangeCurriculum = ['developer', 'owner', 'trainer_head', 'registrar'].includes(user?.role_name) && canEdit;
  const canRegisterStudents = ['developer', 'owner', 'trainer_head', 'trainer', 'registrar'].includes(user?.role_name) && canEdit;
  const canEditStudents = ['developer', 'owner', 'trainer_head', 'registrar'].includes(user?.role_name) && canEdit;
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [curriculums, setCurriculums] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', age: '', gender: '',
    student_class: '', school_name_external: '', curriculum_id: '',
    parent_name: '', parent_contact: '', parent_alternate_contact: '',
    parent_email: '', parent_address: '', parent_qualification: '', parent_occupation: '',
    referral_source: '', program_type: 'long_term', attended_before: false, class_format: '',
    special_remarks: ''
  });

  useEffect(() => {
    if (selectedCenter) {
      loadStudents();
      loadCurriculums();
    }
  }, [selectedCenter]);

  const loadStudents = async () => {
    const res = await api.get(`/students/center/${selectedCenter.id}`);
    setStudents(res.data);
    setFilteredStudents(res.data);
  };

  const loadCurriculums = async () => {
    try {
      const res = await api.get('/curriculum');
      setCurriculums(res.data);
    } catch (err) {
      console.error('Failed to load curriculums:', err);
    }
  };

  const resetForm = () => {
    setForm({
      first_name: '', last_name: '', date_of_birth: '', age: '', gender: '',
      student_class: '', school_name_external: '', curriculum_id: '',
      parent_name: '', parent_contact: '', parent_alternate_contact: '',
      parent_email: '', parent_address: '', parent_qualification: '', parent_occupation: '',
      referral_source: '', program_type: 'long_term', attended_before: false, class_format: '',
      special_remarks: ''
    });
    setEditingStudent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkEdit()) return;
    
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, { 
          ...form, 
          curriculum_id: form.curriculum_id || null 
        });
      } else {
        await api.post('/students/center', { 
          ...form, 
          center_id: selectedCenter.id,
          curriculum_id: form.curriculum_id || null
        });
      }
      setShowForm(false);
      resetForm();
      loadStudents();
      showSuccess(editingStudent ? 'Student updated successfully!' : 'Student registered successfully!');
    } catch (err) {
      showError('Failed to save student');
    }
  };

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '-';
    // dateStr is already in YYYY-MM-DD format from server
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleEdit = (student) => {
    setForm({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      date_of_birth: student.date_of_birth || '', // Already in YYYY-MM-DD format
      age: student.age || '',
      gender: student.gender || '',
      student_class: student.student_class || '',
      school_name_external: student.school_name_external || '',
      curriculum_id: student.curriculum_id || '',
      parent_name: student.parent_name || '',
      parent_contact: student.parent_contact || '',
      parent_alternate_contact: student.parent_alternate_contact || '',
      parent_email: student.parent_email || '',
      parent_address: student.parent_address || '',
      parent_qualification: student.parent_qualification || '',
      parent_occupation: student.parent_occupation || '',
      referral_source: student.referral_source || '',
      program_type: student.program_type || 'long_term',
      attended_before: student.attended_before || false,
      class_format: student.class_format || 'weekday',
      special_remarks: student.special_remarks || ''
    });
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleCurriculumChange = async (studentId, curriculumId) => {
    if (!checkEdit()) return;
    
    try {
      await api.put(`/students/${studentId}`, { curriculum_id: curriculumId || null });
      loadStudents();
      showSuccess('Curriculum updated successfully!');
    } catch (err) {
      showError('Failed to update curriculum');
    }
  };

  const handleDelete = async (student) => {
    if (!checkEdit()) return;
    if (!window.confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/students/${student.id}`);
      showSuccess('Student deleted successfully');
      loadStudents();
    } catch (err) {
      showError('Failed to delete student');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredStudents(students);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = students.filter(student => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const schoolName = (student.school_name_external || '').toLowerCase();
      const parentName = (student.parent_name || '').toLowerCase();
      const contact = (student.parent_contact || '').toLowerCase();
      
      return fullName.includes(lowerQuery) || 
             schoolName.includes(lowerQuery) || 
             parentName.includes(lowerQuery) ||
             contact.includes(lowerQuery);
    });
    setFilteredStudents(filtered);
  };

  if (!selectedCenter) return <p>Please select a center first.</p>;

  return (
    <div className="students-page">
      <div className="page-header">
        <h2>Center Students</h2>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, school, parent, or contact..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => handleSearch('')} 
                className="clear-search"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {canRegisterStudents && (
            <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="btn-primary">
              {showForm ? 'Cancel' : 'Register Student'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <form onSubmit={handleSubmit} className="student-registration-form modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
            <h3>{editingStudent ? 'Edit Student' : 'Student Registration'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="close-btn">×</button>
          </div>

          <div className="form-section">
            <h4>Personal Information</h4>
            <div className="form-grid">
              <div className="form-field">
                <label>First Name <span className="required">*</span></label>
                <input 
                  type="text"
                  placeholder="Enter first name" 
                  value={form.first_name} 
                  onChange={(e) => setForm({...form, first_name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-field">
                <label>Last Name</label>
                <input 
                  type="text"
                  placeholder="Enter last name" 
                  value={form.last_name} 
                  onChange={(e) => setForm({...form, last_name: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Date of Birth <span className="required">*</span></label>
                <DatePicker
                  selected={form.date_of_birth ? new Date(form.date_of_birth) : null}
                  onChange={(date) => setForm({...form, date_of_birth: date ? date.toISOString().split('T')[0] : ''})}
                  placeholder="Select date of birth"
                  required
                  maxDate={new Date()}
                />
              </div>
              <div className="form-field">
                <label>Age</label>
                <input 
                  type="number" 
                  placeholder="Age" 
                  value={form.age} 
                  onChange={(e) => setForm({...form, age: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>School Information</h4>
            <div className="form-grid">
              <div className="form-field">
                <label>School Name</label>
                <input 
                  type="text"
                  placeholder="Enter school name" 
                  value={form.school_name_external} 
                  onChange={(e) => setForm({...form, school_name_external: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Class/Grade</label>
                <input 
                  type="text"
                  placeholder="e.g., Class 5, Grade 7" 
                  value={form.student_class} 
                  onChange={(e) => setForm({...form, student_class: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {canChangeCurriculum && (
            <div className="form-section">
              <h4>Curriculum Assignment</h4>
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Select Curriculum</label>
                  <select 
                    value={form.curriculum_id} 
                    onChange={(e) => setForm({...form, curriculum_id: e.target.value})}
                  >
                    <option value="">-- No Curriculum --</option>
                    {curriculums.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="form-section">
            <h4>Parent/Guardian Information</h4>
            <div className="form-grid">
              <div className="form-field">
                <label>Parent Name</label>
                <input 
                  type="text"
                  placeholder="Enter parent name" 
                  value={form.parent_name} 
                  onChange={(e) => setForm({...form, parent_name: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Contact Number</label>
                <input 
                  type="tel"
                  placeholder="Enter contact number" 
                  value={form.parent_contact} 
                  onChange={(e) => setForm({...form, parent_contact: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Alternate Contact</label>
                <input 
                  type="tel"
                  placeholder="Enter alternate contact" 
                  value={form.parent_alternate_contact} 
                  onChange={(e) => setForm({...form, parent_alternate_contact: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="Enter email address" 
                  value={form.parent_email} 
                  onChange={(e) => setForm({...form, parent_email: e.target.value})} 
                />
              </div>
              <div className="form-field full-width">
                <label>Address</label>
                <textarea 
                  placeholder="Enter full address" 
                  value={form.parent_address} 
                  onChange={(e) => setForm({...form, parent_address: e.target.value})}
                  rows="2"
                />
              </div>
              <div className="form-field">
                <label>Qualification</label>
                <input 
                  type="text"
                  placeholder="Parent qualification" 
                  value={form.parent_qualification} 
                  onChange={(e) => setForm({...form, parent_qualification: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Occupation</label>
                <input 
                  type="text"
                  placeholder="Parent occupation" 
                  value={form.parent_occupation} 
                  onChange={(e) => setForm({...form, parent_occupation: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Program Details</h4>
            <div className="form-grid">
              <div className="form-field">
                <label>Referral Source</label>
                <input 
                  type="text"
                  placeholder="How did you hear about us?" 
                  value={form.referral_source} 
                  onChange={(e) => setForm({...form, referral_source: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Program Type</label>
                <select value={form.program_type} onChange={(e) => setForm({...form, program_type: e.target.value})}>
                  <option value="long_term">Long-term Course</option>
                  <option value="short_term">Short-term Course</option>
                  <option value="holiday_program">Holiday Program</option>
                  <option value="birthday_events">Birthday Events</option>
                </select>
              </div>
              <div className="form-field">
                <label>Class Format <span className="required">*</span></label>
                <select value={form.class_format} onChange={(e) => setForm({...form, class_format: e.target.value})} required>
                  <option value="">Select class format</option>
                  <option value="weekday">Weekday</option>
                  <option value="weekend">Weekend</option>
                </select>
              </div>
              <div className="form-field">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={form.attended_before} 
                    onChange={(e) => setForm({...form, attended_before: e.target.checked})} 
                  />
                  <span>Has attended before</span>
                </label>
              </div>
              <div className="form-field full-width">
                <label>Special Remarks</label>
                <textarea 
                  placeholder="Any special notes or remarks about the student..." 
                  value={form.special_remarks} 
                  onChange={(e) => setForm({...form, special_remarks: e.target.value})}
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingStudent ? 'Update Student' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>DOB</th><th>Age</th><th>Curriculum</th><th>Contact</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
                  {searchQuery ? 'No students found matching your search' : 'No students found'}
                </td>
              </tr>
            ) : (
              filteredStudents.map(s => (
              <tr 
                key={s.id} 
                onClick={() => navigate(`/center/student/${s.id}`)}
                className="clickable-row"
              >
                <td>{s.first_name} {s.last_name}</td>
                <td>{formatDateForDisplay(s.date_of_birth)}</td>
                <td>{s.age || '-'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {canChangeCurriculum ? (
                    <select 
                      value={s.curriculum_id || ''} 
                      onChange={(e) => handleCurriculumChange(s.id, e.target.value)}
                      style={{padding: '0.35rem', borderRadius: '6px', border: '1px solid #e2e8f0'}}
                    >
                      <option value="">No Curriculum</option>
                      {curriculums.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{curriculums.find(c => c.id === s.curriculum_id)?.name || '-'}</span>
                  )}
                </td>
                <td>{s.parent_contact || '-'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {canEditStudents ? (
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button onClick={() => handleEdit(s)} className="btn-sm btn-secondary">Edit</button>
                      <button onClick={() => handleDelete(s)} className="btn-sm btn-danger">Delete</button>
                    </div>
                  ) : '-'}
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CenterStudents;
