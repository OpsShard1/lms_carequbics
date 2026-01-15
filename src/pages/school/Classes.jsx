import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import '../../styles/classes.css';

const SchoolClasses = () => {
  const { selectedSchool, selectSchool, availableSchools } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState({ name: '', grade: '', section: '', room_number: '' });
  
  // Students in class
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: '', parent_name: '', parent_contact: '' });

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
    }
  }, [selectedSchool]);

  const loadClasses = async () => {
    if (!selectedSchool?.id) return;
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const startNewClass = () => {
    setEditingClass(null);
    setForm({ name: '', grade: '', section: '', room_number: '' });
    setStudents([]);
    setShowForm(true);
  };

  const startEditClass = async (classItem) => {
    setEditingClass(classItem);
    setForm({
      name: classItem.name,
      grade: classItem.grade || '',
      section: classItem.section || '',
      room_number: classItem.room_number || ''
    });
    
    // Load students for this class
    try {
      const res = await api.get(`/students/class/${classItem.id}`);
      setStudents(res.data.map(s => ({ ...s, isExisting: true })));
    } catch (err) {
      console.error('Failed to load class students:', err);
      setStudents([]);
    }
    
    setShowForm(true);
  };

  const addStudentToList = () => {
    if (!newStudent.first_name || !newStudent.date_of_birth) {
      alert('First name and date of birth are required');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchool?.id) {
      alert('Please select a school first');
      return;
    }

    try {
      let classId;
      
      if (editingClass) {
        // Update class
        await api.put(`/classes/${editingClass.id}`, { ...form, is_active: true });
        classId = editingClass.id;
      } else {
        // Create class
        const classRes = await api.post('/classes', { ...form, school_id: selectedSchool.id });
        classId = classRes.data.id;
      }

      // Handle students
      for (const student of students) {
        if (student.isNew) {
          // Create new student
          await api.post('/students/school', {
            ...student,
            school_id: selectedSchool.id,
            class_id: classId
          });
        } else if (student.toRemove) {
          // Remove student from class (set class_id to null)
          await api.put(`/students/${student.id}`, { class_id: null });
        }
      }

      setShowForm(false);
      setEditingClass(null);
      setStudents([]);
      loadClasses();
      alert(editingClass ? 'Class updated successfully!' : 'Class created with students!');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteClass = async (classId) => {
    if (!confirm('Are you sure? Students will be unassigned from this class.')) return;
    try {
      await api.delete(`/classes/${classId}`);
      loadClasses();
    } catch (err) {
      alert('Failed to delete class');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="classes-page">
      <div className="page-header">
        <h2>Classes Management</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {availableSchools.length > 1 && (
            <select 
              value={selectedSchool?.id || ''} 
              onChange={(e) => {
                const school = availableSchools.find(s => s.id === parseInt(e.target.value));
                selectSchool(school);
              }}
              className="school-selector"
            >
              <option value="">Select School</option>
              {availableSchools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button onClick={startNewClass} className="btn-primary" disabled={!selectedSchool}>
            Create Class
          </button>
        </div>
      </div>

      {!selectedSchool ? (
        <div className="welcome-message">
          <h3>Select a School</h3>
          <p>Please select a school to view and manage classes.</p>
        </div>
      ) : showForm ? (
        <div className="class-form-container">
          <div className="form-card">
            <h3>{editingClass ? `Edit Class: ${editingClass.name}` : 'Create New Class'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h4>Class Details</h4>
                <div className="form-row">
                  <input placeholder="Class Name *" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                  <input placeholder="Grade (e.g., 1, 2, 3)" value={form.grade} onChange={(e) => setForm({...form, grade: e.target.value})} />
                </div>
                <div className="form-row">
                  <input placeholder="Section (e.g., A, B)" value={form.section} onChange={(e) => setForm({...form, section: e.target.value})} />
                  <input placeholder="Room Number" value={form.room_number} onChange={(e) => setForm({...form, room_number: e.target.value})} />
                </div>
              </div>

              <div className="form-section">
                <h4>Students ({students.filter(s => !s.toRemove).length})</h4>
                <p className="hint">Add students to this class. They will automatically follow the class timetable.</p>
                
                <div className="add-student-row">
                  <input placeholder="First Name *" value={newStudent.first_name} onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})} />
                  <input placeholder="Last Name" value={newStudent.last_name} onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})} />
                  <input type="date" placeholder="DOB *" value={newStudent.date_of_birth} onChange={(e) => setNewStudent({...newStudent, date_of_birth: e.target.value})} />
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
                          <tr key={s.id} className={s.toRemove ? 'to-remove' : ''}>
                            <td>{s.first_name} {s.last_name}</td>
                            <td>{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '-'}</td>
                            <td>{s.gender || '-'}</td>
                            <td>{s.parent_name || '-'}</td>
                            <td>{s.parent_contact || '-'}</td>
                            <td>
                              {s.isNew && <span className="badge new">New</span>}
                              {s.isExisting && !s.toRemove && <span className="badge existing">Existing</span>}
                              {s.toRemove && <span className="badge remove">Will Remove</span>}
                            </td>
                            <td>
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
                <button type="button" onClick={() => { setShowForm(false); setEditingClass(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingClass ? 'Update Class' : 'Create Class with Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {classes.length === 0 ? (
            <div className="no-data">
              <p>No classes found.</p>
              <p className="hint">Click "Create Class" to add a class with students.</p>
            </div>
          ) : (
            <div className="classes-grid">
              {classes.map(c => (
                <div key={c.id} className="class-card">
                  <div className="class-header">
                    <h3>{c.name}</h3>
                    <span className="grade-badge">Grade {c.grade || '-'}</span>
                  </div>
                  <div className="class-details">
                    <p><strong>Section:</strong> {c.section || '-'}</p>
                    <p><strong>Room:</strong> {c.room_number || '-'}</p>
                  </div>
                  <div className="class-actions">
                    <button onClick={() => startEditClass(c)} className="btn-secondary btn-sm">Edit / Manage Students</button>
                    <button onClick={() => deleteClass(c.id)} className="btn-danger btn-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SchoolClasses;
