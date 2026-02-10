import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import { useEditMode } from '../../hooks/useEditMode';
import api from '../../api/axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import '../../styles/attendance.css';

const SchoolAttendance = () => {
  const { selectedSchool, canAddExtraStudents, canMarkAttendance, user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const { canEdit, checkEdit } = useEditMode();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraStudent, setExtraStudent] = useState({
    first_name: '', last_name: '', date_of_birth: '', parent_name: '', parent_contact: ''
  });

  // Get all days in the selected month
  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    if (selectedSchool) loadClasses();
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadMonthAttendance();
    }
  }, [selectedClass, selectedMonth]);

  const loadClasses = async () => {
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.get(`/students/class/${selectedClass}`);
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadMonthAttendance = async () => {
    setLoading(true);
    try {
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      const res = await api.get(`/attendance/school/${selectedSchool.id}/range?startDate=${startDate}&endDate=${endDate}&classId=${selectedClass}`);
      
      const dataMap = {};
      res.data.forEach(record => {
        const dateKey = format(new Date(record.attendance_date), 'yyyy-MM-dd');
        const key = `${record.student_id}-${dateKey}`;
        dataMap[key] = record.status;
      });
      setAttendanceData(dataMap);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId, date, currentStatus) => {
    if (!canMarkAttendance()) return; // Can't mark attendance
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${studentId}-${dateStr}`;
    
    let newStatus = null;
    if (!currentStatus) newStatus = 'present';
    else if (currentStatus === 'present') newStatus = 'absent';
    else if (currentStatus === 'absent') newStatus = 'late';
    else newStatus = null;

    setAttendanceData(prev => {
      const newData = { ...prev };
      if (newStatus) {
        newData[key] = newStatus;
      } else {
        delete newData[key];
      }
      return newData;
    });
  };

  const markColumnPresent = (date) => {
    if (!canMarkAttendance()) return; // Can't mark attendance
    
    const dateStr = format(date, 'yyyy-MM-dd');
    setAttendanceData(prev => {
      const newData = { ...prev };
      students.forEach(s => {
        newData[`${s.id}-${dateStr}`] = 'present';
      });
      return newData;
    });
  };

  const saveAttendance = async () => {
    if (!checkEdit()) {
      setSaving(false);
      return;
    }
    
    setSaving(true);
    try {
      const recordsByDate = {};
      Object.entries(attendanceData).forEach(([key, status]) => {
        const actualStudentId = key.split('-')[0];
        const actualDate = key.substring(actualStudentId.length + 1);
        
        if (!recordsByDate[actualDate]) recordsByDate[actualDate] = [];
        recordsByDate[actualDate].push({
          student_id: parseInt(actualStudentId),
          status
        });
      });

      for (const [date, records] of Object.entries(recordsByDate)) {
        await api.post('/attendance/school/mark-bulk', {
          school_id: selectedSchool.id,
          class_id: selectedClass,
          attendance_date: date,
          records
        });
      }
      
      showSuccess('Attendance saved successfully!');
      loadMonthAttendance();
    } catch (err) {
      console.error('Failed to save attendance:', err);
      showError('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExtraStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students/school/extra', {
        ...extraStudent,
        school_id: selectedSchool.id,
        class_id: selectedClass
      });
      setShowAddExtra(false);
      setExtraStudent({ first_name: '', last_name: '', date_of_birth: '', parent_name: '', parent_contact: '' });
      loadStudents();
      alert('Extra student added!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add student');
    }
  };

  const getStatusClass = (status) => {
    if (status === 'present') return 'cell-present';
    if (status === 'absent') return 'cell-absent';
    if (status === 'late') return 'cell-late';
    return '';
  };

  const getStatusLabel = (status) => {
    if (status === 'present') return 'P';
    if (status === 'absent') return 'A';
    if (status === 'late') return 'L';
    return '';
  };

  const isWeekend = (date) => {
    const day = getDay(date);
    return day === 0 || day === 6;
  };

  if (!selectedSchool) return <div className="no-data"><p>Please select a school first.</p></div>;

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2>School Attendance</h2>
        <p className="subtitle">Monthly attendance view - Click cells to mark P/A/L</p>
      </div>

      <div className="attendance-controls">
        <div className="date-time-picker">
          <div className="form-group">
            <label>Month</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} - Grade {c.grade}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="action-buttons">
          {selectedClass && canAddExtraStudents() && canMarkAttendance() && (
            <button onClick={() => setShowAddExtra(true)} className="btn-secondary">
              + Add Extra Student
            </button>
          )}
          {selectedClass && students.length > 0 && canMarkAttendance() && canEdit && (
            <button onClick={saveAttendance} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </div>
      </div>

      {/* Add Extra Student Modal */}
      {showAddExtra && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Extra Student</h3>
            <p className="modal-hint">Extra students are shown in yellow and are added by trainers.</p>
            <form onSubmit={handleAddExtraStudent}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input 
                    value={extraStudent.first_name}
                    onChange={(e) => setExtraStudent({...extraStudent, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input 
                    value={extraStudent.last_name}
                    onChange={(e) => setExtraStudent({...extraStudent, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input 
                  type="date"
                  value={extraStudent.date_of_birth}
                  onChange={(e) => setExtraStudent({...extraStudent, date_of_birth: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Parent Name</label>
                  <input 
                    value={extraStudent.parent_name}
                    onChange={(e) => setExtraStudent({...extraStudent, parent_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Parent Contact</label>
                  <input 
                    value={extraStudent.parent_contact}
                    onChange={(e) => setExtraStudent({...extraStudent, parent_contact: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddExtra(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!selectedClass ? (
        <div className="no-data">
          <p>📚 Select a class to view and mark attendance</p>
        </div>
      ) : loading ? (
        <div className="no-data"><p>Loading...</p></div>
      ) : students.length === 0 ? (
        <div className="no-data">
          <p>No students in this class yet.</p>
        </div>
      ) : (
        <div className="monthly-attendance-container">
          <div className="monthly-grid-wrapper">
            <table className="monthly-attendance-table">
              <thead>
                <tr>
                  <th className="sticky-col student-header">Student Name</th>
                  {daysInMonth.map(day => (
                    <th 
                      key={day.toISOString()} 
                      className={`date-header ${isWeekend(day) ? 'weekend' : ''}`}
                      onClick={() => markColumnPresent(day)}
                      title="Click to mark all present"
                    >
                      <div className="date-num">{format(day, 'd')}</div>
                      <div className="date-day">{format(day, 'EEE')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className={student.is_extra ? 'extra-student-row' : ''}>
                    <td className={`sticky-col student-name-cell ${student.is_extra ? 'extra-student' : ''}`}>
                      <div className="student-name">
                        {student.first_name} {student.last_name}
                        {student.is_extra && <span className="extra-badge">EXTRA</span>}
                      </div>
                    </td>
                    {daysInMonth.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const key = `${student.id}-${dateStr}`;
                      const status = attendanceData[key];
                      return (
                        <td 
                          key={day.toISOString()}
                          className={`attendance-cell ${getStatusClass(status)} ${isWeekend(day) ? 'weekend' : ''}`}
                          onClick={() => toggleAttendance(student.id, day, status)}
                        >
                          {getStatusLabel(status)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="attendance-legend">
            <span className="legend-item"><span className="legend-box present"></span> P = Present</span>
            <span className="legend-item"><span className="legend-box absent"></span> A = Absent</span>
            <span className="legend-item"><span className="legend-box late"></span> L = Late</span>
            <span className="legend-item"><span className="legend-box weekend-box"></span> Weekend</span>
            <span className="legend-item"><span className="legend-box extra-box"></span> Extra Student</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolAttendance;
