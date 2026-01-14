import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const CenterStudents = () => {
  const { selectedCenter } = useAuth();
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', age: '', gender: '',
    student_class: '', school_name_external: '', parent_name: '', parent_contact: '', parent_alternate_contact: '',
    parent_email: '', parent_address: '', parent_qualification: '', parent_occupation: '',
    referral_source: '', program_type: 'long_term', attended_before: false, class_format: 'weekday'
  });

  useEffect(() => {
    if (selectedCenter) loadStudents();
  }, [selectedCenter]);

  const loadStudents = async () => {
    const res = await api.get(`/students/center/${selectedCenter.id}`);
    setStudents(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/students/center', { ...form, center_id: selectedCenter.id });
    setShowForm(false);
    setForm({
      first_name: '', last_name: '', date_of_birth: '', age: '', gender: '',
      student_class: '', school_name_external: '', parent_name: '', parent_contact: '', parent_alternate_contact: '',
      parent_email: '', parent_address: '', parent_qualification: '', parent_occupation: '',
      referral_source: '', program_type: 'long_term', attended_before: false, class_format: 'weekday'
    });
    loadStudents();
  };

  if (!selectedCenter) return <p>Please select a center first.</p>;

  return (
    <div className="students-page">
      <div className="page-header">
        <h2>Center Students</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Register Student'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card registration-form">
          <h3>Personal Information</h3>
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

          <button type="submit" className="btn-primary">Register Student</button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>School</th><th>Program</th><th>Parent</th><th>Contact</th></tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id}>
              <td>{s.first_name} {s.last_name}</td>
              <td>{s.school_name_external || '-'}</td>
              <td>{s.program_type}</td>
              <td>{s.parent_name}</td>
              <td>{s.parent_contact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CenterStudents;
