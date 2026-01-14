import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { format } from 'date-fns';
import '../../styles/attendance.css';

const CenterAttendance = () => {
  const { selectedCenter } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
  const [attendanceMap, setAttendanceMap] = useState({});
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedCenter) {
      loadStudents();
      loadRecentAttendance();
    }
  }, [selectedCenter]);

  useEffect(() => {
    if (selectedCenter && selectedDate) {
      loadAttendanceForDate();
    }
  }, [selectedCenter, selectedDate]);

  const loadStudents = async () => {
    try {
      const res = await api.get(`/students/center/${selectedCenter.id}`);
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadAttendanceForDate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/center/${selectedCenter.id}?startDate=${selectedDate}&endDate=${selectedDate}`);
      const map = {};
      res.data.forEach(a => {
        map[a.student_id] = a.status;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentAttendance = async () => {
    try {
      const res = await api.get(`/attendance/center/${selectedCenter.id}`);
      setRecentAttendance(res.data);
    } catch (err) {
      console.error('Failed to load recent attendance:', err);
    }
  };

  const toggleAttendance = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status
    }));
  };

  const markAllPresent = () => {
    const newMap = {};
    students.forEach(s => {
      newMap[s.id] = 'present';
    });
    setAttendanceMap(newMap);
  };

  const markAllAbsent = () => {
    const newMap = {};
    students.forEach(s => {
      newMap[s.id] = 'absent';
    });
    setAttendanceMap(newMap);
  };

  const clearAll = () => {
    setAttendanceMap({});
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(attendanceMap)
        .filter(([_, status]) => status)
        .map(([studentId, status]) => 
          api.post('/attendance/center/mark', {
            center_id: selectedCenter.id,
            student_id: parseInt(studentId),
            attendance_date: selectedDate,
            attendance_time: selectedTime,
            status
          })
        );
      
      await Promise.all(promises);
      alert('Attendance saved successfully!');
      loadRecentAttendance();
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedCenter) return <p>Please select a center first.</p>;

  const markedCount = Object.values(attendanceMap).filter(Boolean).length;
  const presentCount = Object.values(attendanceMap).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(s => s === 'absent').length;

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2>Center Attendance (Manual)</h2>
        <p className="subtitle">Mark attendance for any date and time - not tied to any timetable</p>
      </div>

      <div className="attendance-controls">
        <div className="date-time-picker">
          <div className="form-group">
            <label>Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input 
              type="time" 
              value={selectedTime} 
              onChange={(e) => setSelectedTime(e.target.value)} 
            />
          </div>
        </div>

        <div className="bulk-actions">
          <button onClick={markAllPresent} className="btn-success">Mark All Present</button>
          <button onClick={markAllAbsent} className="btn-danger">Mark All Absent</button>
          <button onClick={clearAll} className="btn-secondary">Clear All</button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="attendance-summary">
            <span>Total: {students.length}</span>
            <span className="present">Present: {presentCount}</span>
            <span className="absent">Absent: {absentCount}</span>
            <span>Unmarked: {students.length - markedCount}</span>
          </div>

          <div className="students-attendance-grid">
            {students.map(student => (
              <div key={student.id} className={`student-card ${attendanceMap[student.id] || 'unmarked'}`}>
                <div className="student-info">
                  <span className="student-name">{student.first_name} {student.last_name}</span>
                  <span className="student-school">{student.school_name_external || 'No school'}</span>
                </div>
                <div className="attendance-buttons">
                  <button 
                    className={`btn-sm ${attendanceMap[student.id] === 'present' ? 'active' : ''}`}
                    onClick={() => toggleAttendance(student.id, 'present')}
                  >
                    P
                  </button>
                  <button 
                    className={`btn-sm ${attendanceMap[student.id] === 'absent' ? 'active' : ''}`}
                    onClick={() => toggleAttendance(student.id, 'absent')}
                  >
                    A
                  </button>
                  <button 
                    className={`btn-sm ${attendanceMap[student.id] === 'late' ? 'active' : ''}`}
                    onClick={() => toggleAttendance(student.id, 'late')}
                  >
                    L
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="save-section">
            <button 
              onClick={saveAttendance} 
              className="btn-primary btn-large"
              disabled={saving || markedCount === 0}
            >
              {saving ? 'Saving...' : `Save Attendance (${markedCount} students)`}
            </button>
          </div>
        </>
      )}

      <div className="recent-attendance">
        <h3>Recent Attendance Records</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentAttendance.slice(0, 20).map(a => (
              <tr key={a.id}>
                <td>{a.first_name} {a.last_name}</td>
                <td>{format(new Date(a.attendance_date), 'dd MMM yyyy')}</td>
                <td>{a.attendance_time || '-'}</td>
                <td><span className={`status-badge ${a.status}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CenterAttendance;
