import { useState } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import '../styles/parent-progress.css';

const ParentProgress = () => {
  const [studentName, setStudentName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await api.post('/progress/parent/view', {
        student_name: studentName,
        date_of_birth: dateOfBirth
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to find student. Please check the name and date of birth.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '◐';
      default: return '○';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'in_progress': return 'status-progress';
      default: return 'status-not-started';
    }
  };

  return (
    <div className="parent-progress-page">
      <div className="parent-progress-container">
        <div className="header-section">
          <h1>Check Your Child's Progress</h1>
          <p>Enter your child's details to view their attendance and learning progress</p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="lookup-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Child's Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary btn-large" disabled={loading}>
              {loading ? 'Searching...' : 'View Progress'}
            </button>
          </form>
        ) : (
          <div className="progress-report">
            <div className="report-header">
              <h2>Progress Report</h2>
              <h3>{result.student.name}</h3>
              <button onClick={() => setResult(null)} className="btn-secondary">
                ← Back to Search
              </button>
            </div>

            <div className="attendance-summary">
              <h4>Attendance Summary</h4>
              <div className="summary-cards">
                <div className="summary-card total">
                  <span className="number">{result.attendance.total_classes}</span>
                  <span className="label">Total Classes</span>
                </div>
                <div className="summary-card present">
                  <span className="number">{result.attendance.present}</span>
                  <span className="label">Present</span>
                </div>
                <div className="summary-card absent">
                  <span className="number">{result.attendance.absent}</span>
                  <span className="label">Absent</span>
                </div>
                <div className="summary-card percentage">
                  <span className="number">{result.attendance.percentage}%</span>
                  <span className="label">Attendance Rate</span>
                </div>
              </div>
            </div>

            <div className="chapter-progress">
              <h4>Chapter Progress</h4>
              {result.progress.length === 0 ? (
                <p className="no-data">No progress records yet.</p>
              ) : (
                <div className="progress-list">
                  {result.progress.map((p, idx) => (
                    <div key={idx} className={`progress-item ${getStatusClass(p.completion_status)}`}>
                      <div className="progress-main">
                        <span className="status-icon">{getStatusIcon(p.completion_status)}</span>
                        <div className="chapter-info">
                          <span className="chapter-name">
                            {p.chapter_number ? `Ch ${p.chapter_number}: ` : ''}{p.chapter_name}
                          </span>
                          <span className="chapter-status">{p.completion_status.replace('_', ' ')}</span>
                        </div>
                        {p.evaluation_score && (
                          <span className="score">{p.evaluation_score}%</span>
                        )}
                      </div>
                      {p.remarks && (
                        <div className="remarks">
                          <em>"{p.remarks}"</em>
                        </div>
                      )}
                      {p.completed_at && (
                        <div className="completed-date">
                          Completed: {format(new Date(p.completed_at), 'dd MMM yyyy')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentProgress;
