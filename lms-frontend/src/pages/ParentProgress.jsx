import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/parent-progress.css';

const SKILL_LABELS = {
  concept_understanding: 'Concept Understanding',
  application_of_knowledge: 'Application of Knowledge',
  hands_on_skill: 'Hands-on Skill',
  communication_skill: 'Communication Skill',
  consistency: 'Consistency',
  idea_generation: 'Idea Generation',
  iteration_improvement: 'Iteration & Improvement'
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ParentProgress = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState([]);
  const [expandedTopics, setExpandedTopics] = useState([]);
  
  // Month selection state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const studentName = searchParams.get('name');
  const dateOfBirth = searchParams.get('dob');

  useEffect(() => {
    if (studentName && dateOfBirth) {
      loadStudentProgress();
    } else {
      navigate('/login');
    }
  }, [studentName, dateOfBirth, selectedMonth, selectedYear]);

  const loadStudentProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/progress/parent/view', {
        student_name: studentName,
        date_of_birth: dateOfBirth,
        month: selectedMonth,
        year: selectedYear
      });
      setStudent(res.data.student);
      setCurriculum(res.data.curriculum);
      setProgressData(res.data.progress);
      setAttendance(res.data.attendance);
    } catch (err) {
      setError(err.response?.data?.error || 'Student not found. Please check the name and date of birth.');
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

  const getSkillIcon = (value) => {
    if (value === 1) return '✓';
    if (value === -1) return '✗';
    return '○';
  };

  const getSkillClass = (value) => {
    if (value === 1) return 'skill-positive';
    if (value === -1) return 'skill-negative';
    return 'skill-neutral';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="status-badge completed">Completed</span>;
      case 'in_progress': return <span className="status-badge in-progress">In Progress</span>;
      default: return <span className="status-badge not-started">Not Started</span>;
    }
  };

  const calculateSubjectProgress = (topics) => {
    if (!topics || topics.length === 0) return 0;
    const completed = topics.filter(t => t.status === 'completed').length;
    return Math.round((completed / topics.length) * 100);
  };

  // Generate calendar grid for the month
  const generateCalendarDays = () => {
    if (!attendance) return [];
    
    const year = selectedYear;
    const month = selectedMonth - 1; // Convert to 0-indexed
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
              {student?.school_name_external && <span>🏫 {student.school_name_external}</span>}
              {student?.student_class && <span>📚 {student.student_class}</span>}
            </p>
            {curriculum && (
              <p className="curriculum-badge">
                📖 {curriculum.name}
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

        {/* Curriculum Progress */}
        {!curriculum ? (
          <div className="no-curriculum-card">
            <div className="icon">📚</div>
            <h3>No Curriculum Assigned</h3>
            <p>This student hasn't been assigned to a curriculum yet. Progress tracking will be available once a curriculum is assigned.</p>
          </div>
        ) : progressData.length === 0 ? (
          <div className="no-progress-card">
            <div className="icon">📝</div>
            <h3>No Progress Recorded Yet</h3>
            <p>The student is enrolled in {curriculum.name} but no topic progress has been recorded yet.</p>
          </div>
        ) : (
          <div className="curriculum-progress-section">
            <h3>📖 Learning Progress - {curriculum.name}</h3>
            
            {progressData.map(subject => (
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
                    <span className="topic-count">{subject.topics?.length || 0} topics</span>
                  </div>
                  <div className="subject-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${calculateSubjectProgress(subject.topics)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{calculateSubjectProgress(subject.topics)}%</span>
                  </div>
                </div>

                {expandedSubjects.includes(subject.id) && (
                  <div className="topics-list">
                    {subject.topics?.map(topic => (
                      <div key={topic.id} className={`topic-item ${topic.status}`}>
                        <div 
                          className="topic-header"
                          onClick={() => {
                            if (expandedTopics.includes(topic.id)) {
                              setExpandedTopics(expandedTopics.filter(id => id !== topic.id));
                            } else {
                              setExpandedTopics([...expandedTopics, topic.id]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="topic-name">
                            <span className="expand-icon-small">{expandedTopics.includes(topic.id) ? '▼' : '▶'}</span>
                            {topic.name}
                          </span>
                          {getStatusBadge(topic.status)}
                        </div>
                        
                        {expandedTopics.includes(topic.id) && (
                          topic.status !== 'not_started' ? (
                            <div className="topic-skills">
                              <h5>Skill Assessment</h5>
                              <div className="skills-grid">
                                {Object.entries(SKILL_LABELS).map(([key, label]) => (
                                  <div key={key} className={`skill-item ${getSkillClass(topic[key])}`}>
                                    <span className="skill-icon">{getSkillIcon(topic[key])}</span>
                                    <span className="skill-label">{label}</span>
                                  </div>
                                ))}
                              </div>
                              {topic.remarks && (
                                <div className="topic-remarks">
                                  <strong>Trainer's Notes:</strong> {topic.remarks}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="topic-not-covered">
                              <p>📚 This topic has not been covered yet.</p>
                            </div>
                          )
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

export default ParentProgress;
