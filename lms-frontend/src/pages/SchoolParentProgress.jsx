import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/parent-progress.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SchoolParentProgress = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [classProgress, setClassProgress] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState([]);
  
  // Month selection state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const studentName = searchParams.get('name');
  const phoneNumber = searchParams.get('phone');

  useEffect(() => {
    if (studentName && phoneNumber) {
      loadStudentProgress();
    } else {
      navigate('/login');
    }
  }, [studentName, phoneNumber, selectedMonth, selectedYear]);

  const loadStudentProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/progress/school-parent/view', {
        student_name: studentName,
        phone_number: phoneNumber,
        month: selectedMonth,
        year: selectedYear
      });
      setStudent(res.data.student);
      setClassProgress(res.data.classProgress);
      setAttendance(res.data.attendance);
    } catch (err) {
      setError(err.response?.data?.error || 'Student not found. Please check the name and phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="status-badge completed">Completed</span>;
      case 'in_progress': return <span className="status-badge in-progress">In Progress</span>;
      default: return <span className="status-badge not-started">Not Started</span>;
    }
  };

  const calculateSubjectProgress = (projects) => {
    if (!projects || projects.length === 0) return 0;
    const completed = projects.filter(p => p.status === 'completed').length;
    return Math.round((completed / projects.length) * 100);
  };

  // Generate calendar grid for the month
  const generateCalendarDays = () => {
    if (!attendance) return [];
    
    const year = selectedYear;
    const month = selectedMonth - 1;
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();
    
    // Create attendance map for quick lookup
    const attendanceMap = {};
    (attendance.records || []).forEach(record => {
      attendanceMap[record.date] = record.status;
    });
    
    const days = [];
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, status: null });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date: dateStr,
        status: attendanceMap[dateStr] || null
      });
    }
    
    return days;
  };

  const getAttendanceCellClass = (status) => {
    if (!status) return '';
    switch (status) {
      case 'present': return 'att-present';
      case 'absent': return 'att-absent';
      case 'late': return 'att-late';
      default: return '';
    }
  };

  const getAttendanceLabel = (status) => {
    if (!status) return '';
    switch (status) {
      case 'present': return 'P';
      case 'absent': return 'A';
      case 'late': return 'L';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="parent-progress-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-progress-page">
        <div className="error-container">
          <div className="error-icon">😕</div>
          <h2>Student Not Found</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-progress-page">
      <div className="parent-header">
        <button onClick={() => navigate('/login')} className="back-btn">
          ← Back
        </button>
        <h1>Student Progress Report</h1>
      </div>

      <div className="parent-content">
        {/* Student Info Card */}
        <div className="student-info-card">
          <div className="student-avatar-large">
            {student?.first_name?.[0]}{student?.last_name?.[0] || ''}
          </div>
          <div className="student-details">
            <h2>{student?.first_name} {student?.last_name}</h2>
            <p className="student-meta">
              {student?.school_name && <span>🏫 {student.school_name}</span>}
              {student?.class_name && <span>📚 {student.class_name}</span>}
            </p>
            {classProgress?.curriculum && (
              <p className="curriculum-badge">
                📖 {classProgress.curriculum.curriculum_name} ({classProgress.curriculum.grade_name})
              </p>
            )}
          </div>
        </div>

        {/* Attendance Calendar */}
        {attendance && (
          <div className="attendance-card">
            <div className="attendance-header">
              <h3>📅 Attendance</h3>
              <div className="month-selector">
                <button onClick={handlePrevMonth} className="month-nav-btn">◀</button>
                <span className="current-month">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
                <button onClick={handleNextMonth} className="month-nav-btn">▶</button>
              </div>
            </div>
            
            <div className="attendance-calendar">
              <div className="calendar-header">
                {DAY_NAMES.map(day => (
                  <div key={day} className="calendar-day-name">{day}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {generateCalendarDays().map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`calendar-cell ${item.day ? '' : 'empty'} ${getAttendanceCellClass(item.status)}`}
                  >
                    {item.day && (
                      <>
                        <span className="cell-day">{item.day}</span>
                        {item.status && <span className="cell-status">{getAttendanceLabel(item.status)}</span>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="attendance-legend">
              <div className="legend-item"><span className="legend-dot present"></span> Present ({attendance.present || 0})</div>
              <div className="legend-item"><span className="legend-dot absent"></span> Absent ({attendance.absent || 0})</div>
              <div className="legend-item"><span className="legend-dot late"></span> Late ({attendance.late || 0})</div>
              <div className="legend-item"><strong>This Month: {attendance.percentage || 0}%</strong></div>
            </div>
            
            <div className="attendance-overall">
              Overall Attendance: <strong>{attendance.presentAllTime || 0}</strong> / {attendance.totalAllTime || 0} days (<strong>{attendance.percentageAllTime || 0}%</strong>)
            </div>
          </div>
        )}

        {/* Class Curriculum Progress */}
        {!classProgress?.curriculum ? (
          <div className="no-curriculum-card">
            <div className="icon">📚</div>
            <h3>No Curriculum Assigned</h3>
            <p>This class hasn't been assigned a curriculum yet. Progress tracking will be available once a curriculum is assigned.</p>
          </div>
        ) : classProgress.subjects.length === 0 ? (
          <div className="no-progress-card">
            <div className="icon">📝</div>
            <h3>No Progress Recorded Yet</h3>
            <p>The class is enrolled in {classProgress.curriculum.curriculum_name} but no project progress has been recorded yet.</p>
          </div>
        ) : (
          <div className="curriculum-progress-section">
            <h3>📖 Class Learning Progress - {classProgress.curriculum.curriculum_name}</h3>
            
            {classProgress.subjects.map(subject => (
              <div key={subject.id} className="subject-card">
                <div 
                  className="subject-header"
                  onClick={() => {
                    if (expandedSubjects.includes(subject.id)) {
                      setExpandedSubjects(expandedSubjects.filter(id => id !== subject.id));
                    } else {
                      setExpandedSubjects([...expandedSubjects, subject.id]);
                    }
                  }}
                >
                  <div className="subject-info">
                    <div className="subject-title-row">
                      <span className="expand-icon">{expandedSubjects.includes(subject.id) ? '▼' : '▶'}</span>
                      <h4>{subject.name}</h4>
                    </div>
                    {subject.description && <p className="subject-desc">{subject.description}</p>}
                    <span className="topic-count">{subject.projects?.length || 0} projects</span>
                  </div>
                  <div className="subject-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${calculateSubjectProgress(subject.projects)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{calculateSubjectProgress(subject.projects)}%</span>
                  </div>
                </div>

                {expandedSubjects.includes(subject.id) && (
                  <div className="topics-list">
                    {subject.projects?.map((project, idx) => (
                      <div key={project.id} className={`topic-item ${project.status || 'not_started'}`}>
                        <div className="topic-header">
                          <span className="topic-name">
                            <span className="project-number">{idx + 1}.</span>
                            {project.name}
                          </span>
                          {getStatusBadge(project.status || 'not_started')}
                        </div>
                        
                        {project.description && (
                          <div className="project-description">
                            {project.description}
                          </div>
                        )}
                        
                        {project.status && project.status !== 'not_started' && (
                          <div className="project-details">
                            {project.completion_date && (
                              <div className="project-date">
                                <strong>Completed:</strong> {new Date(project.completion_date).toLocaleDateString()}
                              </div>
                            )}
                            {project.remarks && (
                              <div className="topic-remarks">
                                <strong>Trainer's Notes:</strong> {project.remarks}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolParentProgress;
