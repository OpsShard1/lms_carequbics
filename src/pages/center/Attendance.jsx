import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import '../../styles/attendance.css';

const CenterAttendance = () => {
  const { selectedCenter } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get all days in the selected month
  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    if (selectedCenter) {
      loadStudents();
    }
  }, [selectedCenter]);

  useEffect(() => {
    if (selectedCenter && students.length > 0) {
      loadMonthAttendance();
    }
  }, [selectedCenter, selectedMonth, students]);

  const loadStudents = async () => {
    try {
      const res = await api.get(`/students/center/${selectedCenter.id}`);
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
      const res = await api.get(`/attendance/center/${selectedCenter.id}?startDate=${startDate}&endDate=${endDate}`);
      
      // Create a map: studentId-date -> status
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
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${studentId}-${dateStr}`;
    
    // Cycle through: none -> present -> absent -> late -> none
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
    setSaving(true);
    try {
      // Group by date
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

      // Save each date's attendance
      for (const [date, records] of Object.entries(recordsByDate)) {
        await api.post('/attendance/center/mark-bulk', {
          center_id: selectedCenter.id,
          attendance_date: date,
          records
        });
      }
      
      alert('Attendance saved successfully!');
      loadMonthAttendance();
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
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

  // Calculate stats
  const totalPresent = Object.values(attendanceData).filter(s => s === 'present').length;
  const totalAbsent = Object.values(attendanceData).filter(s => s === 'absent').length;
  const totalLate = Object.values(attendanceData).filter(s => s === 'late').length;

  if (!selectedCenter) return <div className="no-data"><p>Please select a center first.</p></div>;

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2>Center Attendance</h2>
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
        </div>
        
        <div className="attendance-stats">
          <span className="stat present">Present: {totalPresent}</span>
          <span className="stat absent">Absent: {totalAbsent}</span>
          <span className="stat late">Late: {totalLate}</span>
        </div>
        
        {students.length > 0 && (
          <button onClick={saveAttendance} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="no-data"><p>Loading...</p></div>
      ) : students.length === 0 ? (
        <div className="no-data">
          <p>No students registered in this center yet.</p>
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
                  <tr key={student.id}>
                    <td className="sticky-col student-name-cell">
                      <div className="student-name">{student.first_name} {student.last_name}</div>
                      <div className="student-school">{student.school_name_external || ''}</div>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterAttendance;
