import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/student-profile.css';

const SKILL_LABELS = {
  concept_understanding: 'Concept Understanding',
  application_of_knowledge: 'Application of Knowledge',
  hands_on_skill: 'Hands-on Skill',
  communication_skill: 'Communication Skill',
  consistency: 'Consistency',
  idea_generation: 'Idea Generation',
  iteration_improvement: 'Iteration & Improvement'
};

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [progress, setProgress] = useState([]);
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSubjects, setExpandedSubjects] = useState([]);
  const [expandedTopics, setExpandedTopics] = useState([]);

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  useEffect(() => {
    if (student) {
      loadMonthlyAttendance();
    }
  }, [selectedMonth, selectedYear, student]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      
      // Load student details
      const studentRes = await api.get(`/students/${studentId}`);
      setStudent(studentRes.data);

      // Load attendance summary
      const summaryRes = await api.get(`/attendance/summary/student/${studentId}`);
      setAttendanceSummary(summaryRes.data);

      // Load monthly attendance for current month
      await loadMonthlyAttendance();

      // Load curriculum progress if student has curriculum
      if (studentRes.data.curriculum_id) {
        const curriculumRes = await api.get(`/curriculum/${studentRes.data.curriculum_id}/full`);
        setCurriculum(curriculumRes.data);

        const progressRes = await api.get(`/curriculum/progress/student/${studentId}`);
        setProgress(progressRes.data);
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyAttendance = async () => {
    if (!student) return;
    
    try {
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
      const lastDay = new Date(selectedYear, selectedMonth, 0);
      
      const attendanceRes = await api.get(`/attendance/center/${student.center_id}`, {
        params: {
          studentId: studentId,
          startDate: firstDay.toISOString().split('T')[0],
          endDate: lastDay.toISOString().split('T')[0]
        }
      });
      setMonthlyAttendance(attendanceRes.data);
    } catch (err) {
      console.error('Failed to load monthly attendance:', err);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getAttendanceForDate = (date) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return monthlyAttendance.find(a => a.attendance_date.startsWith(dateStr));
  };

  const getAttendanceClass = (status) => {
    if (!status) return 'day-cell';
    const classes = {
      present: 'day-cell present',
      absent: 'day-cell absent',
      late: 'day-cell late',
      excused: 'day-cell excused'
    };
    return classes[status] || 'day-cell';
  };

  const changeMonth = (delta) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: { class: 'badge-success', label: 'Present' },
      absent: { class: 'badge-danger', label: 'Absent' },
      late: { class: 'badge-warning', label: 'Late' },
      excused: { class: 'badge-info', label: 'Excused' }
    };
    const badge = badges[status] || { class: 'badge-secondary', label: status };
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const getProgressBadge = (status) => {
    const badges = {
      not_started: { class: 'badge-secondary', label: 'Not Started' },
      in_progress: { class: 'badge-warning', label: 'In Progress' },
      completed: { class: 'badge-success', label: 'Completed' }
    };
    const badge = badges[status] || { class: 'badge-secondary', label: status };
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
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

  if (loading) {
    return <div className="student-profile"><p>Loading student profile...</p></div>;
  }

  if (!student) {
    return <div className="student-profile"><p>Student not found</p></div>;
  }

  return (
    <div className="student-profile">
      <div className="profile-header">
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
        <div className="profile-title">
          <h2>{student.first_name} {student.last_name}</h2>
          <p className="student-meta">
            {student.school_name_external && `${student.school_name_external} • `}
            {student.student_class && `${student.student_class} • `}
            DOB: {formatDate(student.date_of_birth)}
          </p>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        {curriculum && (
          <button 
            className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>
        )}
      </div>

      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="info-grid">
              <div className="info-card">
                <h3>Personal Information</h3>
                <div className="info-row">
                  <span className="label">Full Name:</span>
                  <span className="value">{student.first_name} {student.last_name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Date of Birth:</span>
                  <span className="value">{formatDate(student.date_of_birth)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Age:</span>
                  <span className="value">{student.age || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Gender:</span>
                  <span className="value">{student.gender || '-'}</span>
                </div>
              </div>

              <div className="info-card">
                <h3>School Information</h3>
                <div className="info-row">
                  <span className="label">School:</span>
                  <span className="value">{student.school_name_external || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Class/Grade:</span>
                  <span className="value">{student.student_class || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Curriculum:</span>
                  <span className="value">{student.curriculum_name || 'Not Assigned'}</span>
                </div>
              </div>

              <div className="info-card">
                <h3>Parent/Guardian Information</h3>
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">{student.parent_name || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Contact:</span>
                  <span className="value">{student.parent_contact || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Alternate Contact:</span>
                  <span className="value">{student.parent_alternate_contact || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{student.parent_email || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Address:</span>
                  <span className="value">{student.parent_address || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Qualification:</span>
                  <span className="value">{student.parent_qualification || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Occupation:</span>
                  <span className="value">{student.parent_occupation || '-'}</span>
                </div>
              </div>

              <div className="info-card">
                <h3>Program Details</h3>
                <div className="info-row">
                  <span className="label">Program Type:</span>
                  <span className="value">{student.program_type?.replace('_', ' ') || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Class Format:</span>
                  <span className="value">{student.class_format || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Attended Before:</span>
                  <span className="value">{student.attended_before ? 'Yes' : 'No'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Referral Source:</span>
                  <span className="value">{student.referral_source || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Enrollment Date:</span>
                  <span className="value">{formatDate(student.enrollment_date)}</span>
                </div>
              </div>

              {student.special_remarks && (
                <div className="info-card">
                  <h3>Special Remarks</h3>
                  <div className="info-row">
                    <p className="remarks-text">{student.special_remarks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="attendance-tab">
            <div className="attendance-header">
              <h3>Attendance Records</h3>
              <div className="month-selector">
                <button onClick={() => changeMonth(-1)} className="month-nav">←</button>
                <span className="month-display">{monthNames[selectedMonth - 1]} {selectedYear}</span>
                <button onClick={() => changeMonth(1)} className="month-nav">→</button>
              </div>
            </div>

            <div className="attendance-calendar">
              <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="day-header">{day}</div>
                ))}
                {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => {
                  const date = i + 1;
                  const record = getAttendanceForDate(date);
                  return (
                    <div key={date} className={getAttendanceClass(record?.status)}>
                      <div className="day-number">{date}</div>
                      {record && (
                        <div className="day-status">{record.status.charAt(0).toUpperCase()}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="attendance-legend">
              <div className="legend-item">
                <span className="legend-color present"></span>
                <span>Present</span>
              </div>
              <div className="legend-item">
                <span className="legend-color absent"></span>
                <span>Absent</span>
              </div>
              <div className="legend-item">
                <span className="legend-color late"></span>
                <span>Late</span>
              </div>
              <div className="legend-item">
                <span className="legend-color excused"></span>
                <span>Excused</span>
              </div>
            </div>

            {attendanceSummary && (
              <div className="monthly-summary">
                <h4>Overall Summary</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Total Days:</span>
                    <span className="summary-value">{attendanceSummary.total_records || 0}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Present:</span>
                    <span className="summary-value success">{attendanceSummary.present_count || 0}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Absent:</span>
                    <span className="summary-value danger">{attendanceSummary.absent_count || 0}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Late:</span>
                    <span className="summary-value warning">{attendanceSummary.late_count || 0}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Attendance Rate:</span>
                    <span className="summary-value">
                      {(() => {
                        const total = Number(attendanceSummary.total_records) || 0;
                        const present = Number(attendanceSummary.present_count) || 0;
                        const late = Number(attendanceSummary.late_count) || 0;
                        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
                        return percentage;
                      })()}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && curriculum && (
          <div className="progress-tab">
            <h3>Curriculum Progress: {curriculum.name}</h3>
            {curriculum.subjects && curriculum.subjects.length > 0 ? (
              <div className="subjects-list">
                {curriculum.subjects.map(subject => {
                  const subjectProgress = progress.filter(p => p.subject_id === subject.id);
                  const completedTopics = subjectProgress.filter(p => p.status === 'completed').length;
                  const totalTopics = subject.topics?.length || 0;
                  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

                  return (
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
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="subject-info">
                          <h4>
                            <span className="expand-icon">{expandedSubjects.includes(subject.id) ? '▼' : '▶'}</span>
                            {subject.name}
                          </h4>
                          <span className="progress-badge">{completedTopics}/{totalTopics} Topics ({progressPercent}%)</span>
                        </div>
                        <div className="subject-progress">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{width: `${progressPercent}%`}}></div>
                          </div>
                        </div>
                      </div>
                      {subject.description && <p className="subject-desc">{subject.description}</p>}
                      
                      {expandedSubjects.includes(subject.id) && (
                        <div className="topics-list">
                          {subject.topics && subject.topics.map(topic => {
                            const topicProgress = subjectProgress.find(p => p.topic_id === topic.id);
                            return (
                              <div key={topic.id} className={`topic-item ${topicProgress?.status || 'not_started'}`}>
                                <div 
                                  className="topic-header-row"
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
                                  {getProgressBadge(topicProgress?.status || 'not_started')}
                                </div>
                                
                                {expandedTopics.includes(topic.id) && (
                                  topicProgress && topicProgress.status !== 'not_started' ? (
                                    <div className="topic-details">
                                      <h5 className="skills-title">Skill Assessment</h5>
                                      <div className="skills-grid">
                                        {Object.entries(SKILL_LABELS).map(([key, label]) => (
                                          <div key={key} className={`skill-item ${getSkillClass(topicProgress[key] || 0)}`}>
                                            <span className="skill-icon">{getSkillIcon(topicProgress[key] || 0)}</span>
                                            <span className="skill-label">{label}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {topicProgress.remarks && (
                                        <div className="topic-remarks">
                                          <strong>Trainer's Notes:</strong> {topicProgress.remarks}
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
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-data">No curriculum subjects found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
