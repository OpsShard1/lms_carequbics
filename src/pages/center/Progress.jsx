import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const CenterProgress = () => {
  const { selectedCenter } = useAuth();
  const [students, setStudents] = useState([]);
  const [progress, setProgress] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [form, setForm] = useState({ chapter_name: '', chapter_number: '', completion_status: 'not_started', evaluation_score: '', remarks: '' });

  useEffect(() => {
    if (selectedCenter) {
      loadStudents();
      loadProgress();
    }
  }, [selectedCenter]);

  const loadStudents = async () => {
    const res = await api.get(`/students/center/${selectedCenter.id}`);
    setStudents(res.data);
  };

  const loadProgress = async () => {
    const res = await api.get(`/progress/center/${selectedCenter.id}`);
    setProgress(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return alert('Please select a student');
    await api.post('/progress', { ...form, student_id: selectedStudent, center_id: selectedCenter.id });
    setForm({ chapter_name: '', chapter_number: '', completion_status: 'not_started', evaluation_score: '', remarks: '' });
    loadProgress();
  };

  if (!selectedCenter) return <p>Please select a center first.</p>;

  return (
    <div className="progress-page">
      <div className="page-header">
        <h2>Student Progress Tracking</h2>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <h3>Add Progress Entry</h3>
        <div className="form-row">
          <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required>
            <option value="">Select Student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
          <input placeholder="Chapter Name" value={form.chapter_name} onChange={(e) => setForm({...form, chapter_name: e.target.value})} required />
        </div>
        <div className="form-row">
          <input type="number" placeholder="Chapter #" value={form.chapter_number} onChange={(e) => setForm({...form, chapter_number: e.target.value})} />
          <select value={form.completion_status} onChange={(e) => setForm({...form, completion_status: e.target.value})}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <input type="number" placeholder="Score" value={form.evaluation_score} onChange={(e) => setForm({...form, evaluation_score: e.target.value})} />
        </div>
        <textarea placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} />
        <button type="submit" className="btn-primary">Save Progress</button>
      </form>

      <table className="data-table">
        <thead>
          <tr><th>Student</th><th>Chapter</th><th>Status</th><th>Score</th><th>Remarks</th></tr>
        </thead>
        <tbody>
          {progress.map(p => (
            <tr key={p.id}>
              <td>{p.first_name} {p.last_name}</td>
              <td>{p.chapter_number ? `${p.chapter_number}. ` : ''}{p.chapter_name}</td>
              <td><span className={`status-badge ${p.completion_status}`}>{p.completion_status}</span></td>
              <td>{p.evaluation_score || '-'}</td>
              <td>{p.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CenterProgress;
