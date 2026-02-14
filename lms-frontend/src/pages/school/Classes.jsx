import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import DatePicker from '../../components/DatePicker';
import api from '../../api/axios';
import '../../styles/classes.css';

const SchoolClasses = () => {
  const { selectedSchool, selectSchool, availableSchools, user, canEdit, ownerEditMode } = useAuth();
  const { showSuccess, showError, showWarning } = useNotificationContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Permission check - owner needs edit mode enabled, others can edit by default
  const canEditClasses = user?.role_name === 'owner' 
    ? ownerEditMode 
    : ['developer', 'school_teacher', 'trainer_head'].includes(user?.role_name);
  
  // Trainers can assign curriculum
  const canAssignCurriculum = ['developer', 'owner', 'trainer_head', 'trainer'].includes(user?.role_name);
  
  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [selectedCurriculumFilter, setSelectedCurriculumFilter] = useState(null);
  const [form, setForm] = useState({ name: '', grade: '', section: '', room_number: '' });
  
  // Students in class (only for edit modal)
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: '', parent_name: '', parent_contact: '' });
  
  // Curriculum assignment
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [selectedClassForCurriculum, setSelectedClassForCurriculum] = useState(null);
  const [availableCurriculums, setAvailableCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');

  useEffect(() => {
    // Auto-select first school if none selected
    if (availableSchools.length > 0 && !selectedSchool) {
      selectSchool(availableSchools[0]);
    }
    setLoading(false);
  }, [availableSchools, selectedSchool]);

  useEffect(() => {
    if (selectedSchool?.id) {
      loadClasses();
      // Load curriculums for all users (for filtering), not just those who can edit
      loadCurriculums();
      // Reset form and editing state when school changes
      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingClass(null);
      setSelectedCurriculum(null);
      setForm({ name: '', grade: '', section: '', room_number: '' });
      setStudents([]);
    } else {
      setClasses([]);
    }
  }, [selectedSchool?.id]);

  const loadClasses = async () => {
    if (!selectedSchool?.id) return;
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadCurriculums = async () => {
    try {
      const res = await api.get('/school-curriculum');
      // Sort by grade_name numerically
      const sorted = res.data.sort((a, b) => {
        const gradeA = parseInt(a.grade_name) || 0;
        const gradeB = parseInt(b.grade_name) || 0;
        return gradeA - gradeB;
      });
      setAvailableCurriculums(sorted);
    } catch (err) {
      console.error('Failed to load curriculums:', err);
    }
  };

  const openCurriculumModal = (classItem) => {
    setSelectedClassForCurriculum(classItem);
    setSelectedCurriculumId(classItem.curriculum_id || '');
    setShowCurriculumModal(true);
  };

  const handleAssignCurriculum = async (e) => {
    e.preventDefault();
    if (!selectedCurriculumId) {
      showWarning('Please select a curriculum');
      return;
    }

    try {
      await api.post('/school-curriculum/assign', {
        class_id: selectedClassForCurriculum.id,
        curriculum_id: selectedCurriculumId
      });
      setShowCurriculumModal(false);
      loadClasses();
      showSuccess('Curriculum assigned successfully!');
    } catch (err) {
      showError('Failed to assign curriculum: ' + (err.response?.data?.error || err.message));
    }
  };

  const startNewClass = (curriculum, e) => {
    e.stopPropagation(); // Prevent triggering the filter
    setSelectedCurriculum(curriculum);
    setForm({ 
      name: curriculum.name, 
      grade: curriculum.grade_name, 
      section: '', 
      room_number: '' 
    });
    setShowCreateModal(true);
  };

  const handleCurriculumFilter = (curriculum) => {
    if (selectedCurriculumFilter?.id === curriculum.id) {
      // Deselect if clicking the same curriculum
      setSelectedCurriculumFilter(null);
    } else {
      setSelectedCurriculumFilter(curriculum);
    }
  };

  // Filter classes based on selected curriculum
  const filteredClasses = selectedCurriculumFilter
    ? classes.filter(c => c.curriculum_id === selectedCurriculumFilter.id)
    : classes;

  const startEditClass = async (classItem) => {
    setEditingClass(classItem);
    
    // Load students for this class
    try {
      const res = await api.get(`/students/class/${classItem.id}`);
      setStudents(res.data.map(s => ({ ...s, isExisting: true })));
    } catch (err) {
      console.error('Failed to load class students:', err);
      setStudents([]);
    }
    
    setShowEditModal(true);
  };

  const addStudentToList = () => {
    if (!newStudent.first_name || !newStudent.date_of_birth) {
      showWarning('First name and date of birth are required');
      return;
    }
    
    setStudents([...students, { ...newStudent, id: `new-${Date.now()}`, isNew: true }]);
    setNewStudent({ first_name: '', last_name: '', date_of_birth: '', gender: '', parent_name: '', parent_contact: '' });
  };

  const removeStudentFromList = (index) => {
    const student = students[index];
    if (student.isExisting) {
      // Mark for removal
      setStudents(students.map((s, i) => i === index ? { ...s, toRemove: !s.toRemove } : s));
    } else {
      // Remove new student from list
      setStudents(students.filter((_, i) => i !== index));
    }
  };

  const handleApproveStudent = async (studentId) => {
    try {
      await api.post(`/students/${studentId}/approve`);
      // Reload students to reflect the change
      const res = await api.get(`/students/class/${editingClass.id}`);
      setStudents(res.data.map(s => ({ ...s, isExisting: true })));
      showSuccess('Student approved successfully!');
    } catch (err) {
      showError('Failed to approve student: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDisapproveStudent = async (studentId) => {
    try {
      await api.post(`/students/${studentId}/disapprove`);
      // Reload students to reflect the change
      const res = await api.get(`/students/class/${editingClass.id}`);
      setStudents(res.data.map(s => ({ ...s, isExisting: true })));
      showSuccess('Student disapproved');
    } catch (err) {
      showError('Failed to disapprove student: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!selectedSchool?.id) {
      showWarning('Please select a school first');
      return;
    }

    try {
      // Create class
      const classRes = await api.post('/classes', { ...form, school_id: selectedSchool.id });
      const newClassId = classRes.data.id;

      // Assign curriculum to the class
      if (selectedCurriculum) {
        await api.post('/school-curriculum/assign', {
          class_id: newClassId,
          curriculum_id: selectedCurriculum.id
        });
      }

      setShowCreateModal(false);
      setSelectedCurriculum(null);
      setForm({ name: '', grade: '', section: '', room_number: '' });
      loadClasses();
      showSuccess('Class created and curriculum assigned successfully!');
    } catch (err) {
      showError('Failed to create class: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editingClass) return;

    try {
      // Handle students only
      for (const student of students) {
        if (student.isNew) {
          // Create new student
          await api.post('/students/school', {
            ...student,
            school_id: selectedSchool.id,
            class_id: editingClass.id
          });
        } else if (student.toRemove) {
          // Delete student (set is_active to false)
          await api.delete(`/students/${student.id}`);
        }
      }

      setShowEditModal(false);
      setEditingClass(null);
      setStudents([]);
      loadClasses();
      showSuccess('Students updated successfully!');
    } catch (err) {
      showError('Failed to update students: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteClass = async (classId) => {
    if (!confirm('Are you sure? Students will be unassigned from this class.')) return;
    try {
      await api.delete(`/classes/${classId}`);
      loadClasses();
      showSuccess('Class deleted successfully!');
    } catch (err) {
      showError('Failed to delete class');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="classes-page">
      <div className="page-header">
        <h2>Classes Management</h2>
      </div>

      {!selectedSchool ? (
        <div className="welcome-message">
          <h3>Select a School</h3>
          <p>Please select a school from the navbar to view and manage classes.</p>
        </div>
      ) : (
        <div className="classes-layout">
          {/* Left Panel - Curriculum Filter / Create Class */}
          <div className="create-class-panel">
            <h3>{canEditClasses ? 'Create Class' : 'Filter by Class'}</h3>
            {availableCurriculums.length === 0 ? (
              <div className="no-data">
                <p>No curriculums available</p>
              </div>
            ) : (
              <div className="curriculum-list">
                {availableCurriculums.map(curr => (
                  <div 
                    key={curr.id} 
                    className={`curriculum-item ${selectedCurriculumFilter?.id === curr.id ? 'selected' : ''}`}
                    onClick={() => handleCurriculumFilter(curr)}
                  >
                    <span className="curriculum-name">{curr.name}</span>
                    {canEditClasses && (
                      <button 
                        className="btn-add" 
                        onClick={(e) => startNewClass(curr, e)}
                        title="Create new class"
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel - Existing Classes */}
          <div className="existing-classes-panel">
            <div className="existing-classes-header">
              <h3>Existing Classes</h3>
              {selectedCurriculumFilter && (
                <button 
                  className="btn-clear-filter" 
                  onClick={() => setSelectedCurriculumFilter(null)}
                >
                  Clear Filter
                </button>
              )}
            </div>
            {filteredClasses.length === 0 ? (
              <div className="no-data">
                <p>No classes found.</p>
                {selectedCurriculumFilter && <p className="hint">No classes for {selectedCurriculumFilter.name}.</p>}
                {canEditClasses && !selectedCurriculumFilter && <p className="hint">Select a curriculum from the left to create your first class.</p>}
              </div>
            ) : (
              <div className="classes-grid">
                {filteredClasses.map(c => (
                  <div key={c.id} className="class-card">
                    <div className="class-header">
                      <h3>{c.name}</h3>
                      <span className="grade-badge">Grade {c.grade || '-'}</span>
                    </div>
                    <div className="class-details">
                      <p><strong>Section:</strong> {c.section || '-'}</p>
                      <p><strong>Room:</strong> {c.room_number || '-'}</p>
                      <p><strong>Students:</strong> {c.student_count || 0}</p>
                      {c.curriculum_name && (
                        <p><strong>Curriculum:</strong> {c.curriculum_name}</p>
                      )}
                    </div>
                    <div className="class-actions">
                      {canEditClasses && (
                        <>
                          <button onClick={() => startEditClass(c)} className="btn-secondary btn-sm">Manage Students</button>
                          <button onClick={() => deleteClass(c.id)} className="btn-danger btn-sm">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && selectedCurriculum && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Class: {selectedCurriculum.name}</h3>
            <p className="modal-subtitle">Grade: {selectedCurriculum.grade_name} • {selectedCurriculum.subject_count} subjects</p>
            <form onSubmit={handleCreateClass}>
              <div className="form-row">
                <div className="form-group">
                  <label>Section *</label>
                  <input 
                    placeholder="e.g., A, B, C" 
                    value={form.section} 
                    onChange={(e) => setForm({...form, section: e.target.value})} 
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room Number *</label>
                  <input 
                    placeholder="e.g., 101, 202" 
                    value={form.room_number} 
                    onChange={(e) => setForm({...form, room_number: e.target.value})} 
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Curriculum Modal */}
      {showCurriculumModal && selectedClassForCurriculum && (
        <div className="modal-overlay" onClick={() => setShowCurriculumModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Curriculum to {selectedClassForCurriculum.name}</h3>
            <form onSubmit={handleAssignCurriculum}>
              <div className="form-group">
                <label>Select Curriculum *</label>
                <select 
                  value={selectedCurriculumId} 
                  onChange={(e) => setSelectedCurriculumId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Curriculum --</option>
                  {availableCurriculums.map(curr => (
                    <option key={curr.id} value={curr.id}>
                      {curr.name} - {curr.grade_name} ({curr.subject_count} subjects)
                    </option>
                  ))}
                </select>
                <p className="form-hint">
                  This curriculum will be used to track class progress and projects.
                </p>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCurriculumModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Assign Curriculum</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && editingClass && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>Manage Students: {editingClass.name}</h3>
            <p className="modal-subtitle">Section: {editingClass.section || '-'} • Room: {editingClass.room_number || '-'}</p>
            <form onSubmit={handleUpdateClass}>
              <div className="form-section">
                <h4>Manage Students ({students.filter(s => !s.toRemove).length})</h4>
                
                <div className="add-student-row">
                  <input placeholder="First Name *" value={newStudent.first_name} onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})} />
                  <input placeholder="Last Name" value={newStudent.last_name} onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})} />
                  <DatePicker
                    selected={newStudent.date_of_birth ? new Date(newStudent.date_of_birth + 'T12:00:00') : null}
                    onChange={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setNewStudent({...newStudent, date_of_birth: `${year}-${month}-${day}`});
                      } else {
                        setNewStudent({...newStudent, date_of_birth: ''});
                      }
                    }}
                    placeholder="DOB *"
                    maxDate={new Date()}
                  />
                  <select value={newStudent.gender} onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})}>
                    <option value="">Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <input placeholder="Parent Name" value={newStudent.parent_name} onChange={(e) => setNewStudent({...newStudent, parent_name: e.target.value})} />
                  <input placeholder="Parent Contact" value={newStudent.parent_contact} onChange={(e) => setNewStudent({...newStudent, parent_contact: e.target.value})} />
                  <button type="button" onClick={addStudentToList} className="btn-success btn-sm">+ Add</button>
                </div>

                {students.length > 0 && (
                  <div className="students-list">
                    <table className="data-table compact">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>DOB</th>
                          <th>Gender</th>
                          <th>Parent</th>
                          <th>Contact</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, idx) => (
                          <tr key={s.id} className={`${s.toRemove ? 'to-remove' : ''} ${s.is_extra === 2 ? 'disapproved-student' : ''}`}>
                            <td>
                              {s.first_name} {s.last_name}
                              {s.is_extra === 2 && <span style={{color: '#dc2626', fontWeight: 'bold', marginLeft: '8px'}}>(Not a Student)</span>}
                            </td>
                            <td>{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '-'}</td>
                            <td>{s.gender || '-'}</td>
                            <td>{s.parent_name || '-'}</td>
                            <td>{s.parent_contact || '-'}</td>
                            <td>
                              {s.isNew && <span className="badge new">New</span>}
                              {s.isExisting && !s.toRemove && !s.is_extra && <span className="badge existing">Existing</span>}
                              {s.isExisting && s.is_extra === 1 && <span className="badge extra">Extra</span>}
                              {s.isExisting && s.is_extra === 2 && <span className="badge not-approved">Not Approved</span>}
                              {s.toRemove && <span className="badge remove">Will Remove</span>}
                            </td>
                            <td>
                              {s.is_extra === 1 && canEditClasses && (
                                <>
                                  <button type="button" onClick={() => handleApproveStudent(s.id)} className="btn-sm btn-success" style={{marginRight: '4px'}}>
                                    Approve
                                  </button>
                                  <button type="button" onClick={() => handleDisapproveStudent(s.id)} className="btn-sm btn-warning" style={{marginRight: '4px'}}>
                                    Disapprove
                                  </button>
                                </>
                              )}
                              {s.is_extra === 2 && canEditClasses && (
                                <button type="button" onClick={() => handleApproveStudent(s.id)} className="btn-sm btn-success" style={{marginRight: '4px'}}>
                                  Approve
                                </button>
                              )}
                              <button type="button" onClick={() => removeStudentFromList(idx)} className="btn-sm btn-danger">
                                {s.toRemove ? 'Undo' : 'Remove'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update Students</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolClasses;
