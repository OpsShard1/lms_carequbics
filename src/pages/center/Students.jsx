import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const CenterStudents = () => {
  const { selectedCenter, user } = useAuth();
  const canChangeCurriculum = ['developer', 'trainer_head'].includes(user?.role_name);
  const canEditStudents = ['developer', 'trainer_head', 'trainer'].includes(user?.role_name);
  const [students, setStudents] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', age: '', gender: '',
    student_class: '', school_name_external: '', curriculum_id: '',
    parent_name: '', parent_contact: '', parent_alternate_contact: '',
    parent_email: '', parent_address: '', parent_qualification: '', parent_occupation: '',
    referral_source: '', program_type: 'long_term', attended_before: false, class_format: 'weekday'
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
      referral_source: '', program_type: 'long_term', attended_before: false, class_format: 'weekday'
    });
    setEditingStudent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      alert('Failed to save student');
    }
  };

  const handleEdit = (student) => {
    setForm({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
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
      class_format: student.class_format || 'weekday'
    });
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleCurriculumChange = async (studentId, curriculumId) => {
    try {
      await api.put(`/students/${studentId}`, { curriculum_id: curriculumId || null });
      loadStudents();
    } catch (err) {
      alert('Failed to update curriculum');
    }
  };

  if (!selectedCenter) return <p>Please select a center first.</p>;

  return (
    <div className="students-page">
      <div className="page-header">
        <h2>Center Students</h2>
        {canEditStudents && (
          <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="btn-primary">
            {showForm ? 'Cancel' : 'Register Student'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card registration-form">
          <h3>{editingStudent ? 'Edit Student' : 'Personal Information'}</h3>
          <div className="form-row">
            <input placeholder="First Name *" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
            <input placeholder="Last Name" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} />
          </div>
          <div className="form-row">
            <input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} required />
            <input type="number" placeholder="Age" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} />
            <select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <input placeholder="School Name" value={form.school_name_external} onChange={(e) => setForm({...form, school_name_external: e.target.value})} />
          <input placeholder="Class/Grade (e.g., Class 5, Grade 7)" value={form.student_class} onChange={(e) => setForm({...form, student_class: e.target.value})} />

          {canChangeCurriculum && (
            <>
              <h3>Curriculum Assignment</h3>
              <select value={form.curriculum_id} onChange={(e) => setForm({...form, curriculum_id: e.target.value})} style={{width: '100%', padding: '0.75rem', marginBottom: '1rem'}}>
                <option value="">-- Select Curriculum --</option>
                {curriculums.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </>
          )}

          <h3>Parent Information</h3>
          <div className="form-row">
            <input placeholder="Parent Name" value={form.parent_name} onChange={(e) => setForm({...form, parent_name: e.target.value})} />
            <input placeholder="Contact Number" value={form.parent_contact} onChange={(e) => setForm({...form, parent_contact: e.target.value})} />
          </div>
          <div className="form-row">
            <input placeholder="Alternate Contact" value={form.parent_alternate_contact} onChange={(e) => setForm({...form, parent_alternate_contact: e.target.value})} />
            <input type="email" placeholder="Email" value={form.parent_email} onChange={(e) => setForm({...form, parent_email: e.target.value})} />
          </div>
          <textarea placeholder="Address" value={form.parent_address} onChange={(e) => setForm({...form, parent_address: e.target.value})} />

          <h3>Background Information</h3>
          <div className="form-row">
            <input placeholder="Qualification" value={form.parent_qualification} onChange={(e) => setForm({...form, parent_qualification: e.target.value})} />
            <input placeholder="Occupation" value={form.parent_occupation} onChange={(e) => setForm({...form, parent_occupation: e.target.value})} />
          </div>
          <input placeholder="How did you hear about us?" value={form.referral_source} onChange={(e) => setForm({...form, referral_source: e.target.value})} />

          <h3>Program Details</h3>
          <div className="form-row">
            <select value={form.program_type} onChange={(e) => setForm({...form, program_type: e.target.value})}>
              <option value="long_term">Long-term Course</option>
              <option value="short_term">Short-term Course</option>
              <option value="holiday_program">Holiday Program</option>
              <option value="birthday_events">Birthday Events</option>
            </select>
            <select value={form.class_format} onChange={(e) => setForm({...form, class_format: e.target.value})}>
              <option value="weekday">Weekday</option>
              <option value="weekend">Weekend</option>
            </select>
          </div>
          <label>
            <input type="checkbox" checked={form.attended_before} onChange={(e) => setForm({...form, attended_before: e.target.checked})} />
            Has attended before
          </label>

          <button type="submit" className="btn-primary">{editingStudent ? 'Update Student' : 'Register Student'}</button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>School</th><th>Curriculum</th><th>Program</th><th>Contact</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id}>
              <td>{s.first_name} {s.last_name}</td>
              <td>{s.school_name_external || '-'}</td>
              <td>
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
              <td>{s.program_type?.replace('_', ' ')}</td>
              <td>{s.parent_contact || '-'}</td>
              <td>
                {canEditStudents ? (
                  <button onClick={() => handleEdit(s)} className="btn-sm btn-secondary">Edit</button>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CenterStudents;
