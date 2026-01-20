import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/student-profile.css';

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
                    <span className="summary-value">{attendanceSummary.attendance_percentage || 0}%</span>
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
                      <div className="subject-header">
                        <h4>{subject.name}</h4>
                        <span className="progress-badge">{completedTopics}/{totalTopics} Topics</span>
                      </div>
                      {subject.description && <p className="subject-desc">{subject.description}</p>}
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: `${progressPercent}%`}}></div>
                      </div>
                      <div className="topics-list">
                        {subject.topics && subject.topics.map(topic => {
                          const topicProgress = subjectProgress.find(p => p.topic_id === topic.id);
                          return (
                            <div key={topic.id} className="topic-item">
                              <div className="topic-info">
                                <span className="topic-name">{topic.name}</span>
                                {getProgressBadge(topicProgress?.status || 'not_started')}
                              </div>
                              {topicProgress && topicProgress.status === 'completed' && (
                                <div className="topic-scores">
                                  <span className="score-item">Concept: {topicProgress.concept_understanding || 0}/5</span>
                                  <span className="score-item">Application: {topicProgress.application_of_knowledge || 0}/5</span>
                                  <span className="score-item">Hands-on: {topicProgress.hands_on_skill || 0}/5</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
