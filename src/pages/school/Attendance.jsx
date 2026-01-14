import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { format } from 'date-fns';
import '../../styles/attendance.css';

const SchoolAttendance = () => {
  const { selectedSchool } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [periodGroups, setPeriodGroups] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedSchool) loadClasses();
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedSchool && selectedDate) loadStudentsForDate();
  }, [selectedSchool, selectedDate, selectedClass]);

  const loadClasses = async () => {
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadStudentsForDate = async () => {
    setLoading(true);
    try {
      const params = selectedClass ? `?classId=${selectedClass}` : '';
      const res = await api.get(`/attendance/school/${selectedSchool.id}/students/${selectedDate}${params}`);
      
      // Group students by period
      const groups = {};
      const attMap = {};
      
      res.data.forEach(student => {
        const key = `period-${student.period_number}`;
        if (!groups[key]) {
          groups[key] = {
            period_number: student.period_number,
            subject: student.subject,
            start_time: student.start_time,
            end_time: student.end_time,
            students: []
          };
        }
        groups[key].students.push(student);
        
        // Set existing attendance
        const attKey = `${student.id}-${student.timetable_entry_id}`;
        if (student.existing_status) {
          attMap[attKey] = student.existing_status;
        }
      });
      
      setPeriodGroups(groups);
      setAttendanceMap(attMap);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId, timetableEntryId, status) => {
    const key = `${studentId}-${timetableEntryId}`;
    setAttendanceMap(prev => ({
      ...prev,
      [key]: prev[key] === status ? null : status
    }));
  };

  const markPeriodAllPresent = (periodKey) => {
    const period = periodGroups[periodKey];
    if (!period) return;
    
    setAttendanceMap(prev => {
      const newMap = { ...prev };
      period.students.forEach(s => {
        newMap[`${s.id}-${s.timetable_entry_id}`] = 'present';
      });
      return newMap;
    });
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = [];
      
      Object.entries(attendanceMap).forEach(([key, status]) => {
        if (status) {
          const [studentId, timetableEntryId] = key.split('-');
          // Find the student to get period number
          let periodNumber = null;
          Object.values(periodGroups).forEach(group => {
            const student = group.students.find(s => 
              s.id === parseInt(studentId) && s.timetable_entry_id === parseInt(timetableEntryId)
            );
            if (student) periodNumber = student.period_number;
          });
          
          records.push({
            student_id: parseInt(studentId),
            timetable_entry_id: parseInt(timetableEntryId),
            period_number: periodNumber,
            status
          });
        }
      });

      if (records.length === 0) {
        alert('No attendance to save');
        return;
      }

      await api.post('/attendance/school/mark', {
        school_id: selectedSchool.id,
        class_id: selectedClass || null,
        attendance_date: selectedDate,
        records
      });
      
      alert('Attendance saved successfully!');
      loadStudentsForDate();
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedSchool) return <p>Please select a school first.</p>;

  const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
  const periodKeys = Object.keys(periodGroups).sort((a, b) => {
    return periodGroups[a].period_number - periodGroups[b].period_number;
  });

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2>School Attendance</h2>
        <p className="subtitle">Attendance based on class timetable</p>
      </div>

      <div className="filters">
        <div className="form-group">
          <label>Date</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Filter by Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.grade}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="day-indicator">
        <strong>{dayOfWeek}</strong> - {format(new Date(selectedDate), 'dd MMMM yyyy')}
      </div>

      {loading ? (
        <p>Loading scheduled classes...</p>
      ) : periodKeys.length === 0 ? (
        <div className="no-data">
          <p>No scheduled classes for this date.</p>
          <p className="hint">Make sure a timetable exists for the selected class(es) and includes {dayOfWeek}.</p>
        </div>
      ) : (
        <>
          {periodKeys.map(periodKey => {
            const period = periodGroups[periodKey];
            return (
              <div key={periodKey} className="period-block">
                <div className="period-header">
                  <div className="period-info">
                    <h3>Period {period.period_number}</h3>
                    <span className="time">{period.start_time} - {period.end_time}</span>
                    <span className="subject">{period.subject || 'No subject'}</span>
                  </div>
                  <button 
                    className="btn-sm btn-success"
                    onClick={() => markPeriodAllPresent(periodKey)}
                  >
                    Mark All Present
                  </button>
                </div>
                
                <div className="students-grid">
                  {period.students.map(student => {
                    const attKey = `${student.id}-${student.timetable_entry_id}`;
                    const status = attendanceMap[attKey];
                    return (
                      <div key={attKey} className={`student-row ${status || 'unmarked'}`}>
                        <div className="student-info">
                          <span className="name">{student.first_name} {student.last_name}</span>
                          <span className="class">{student.class_name} ({student.grade})</span>
                        </div>
                        <div className="attendance-buttons">
                          <button 
                            className={`btn-sm btn-present ${status === 'present' ? 'active' : ''}`}
                            onClick={() => toggleAttendance(student.id, student.timetable_entry_id, 'present')}
                          >
                            P
                          </button>
                          <button 
                            className={`btn-sm btn-absent ${status === 'absent' ? 'active' : ''}`}
                            onClick={() => toggleAttendance(student.id, student.timetable_entry_id, 'absent')}
                          >
                            A
                          </button>
                          <button 
                            className={`btn-sm btn-late ${status === 'late' ? 'active' : ''}`}
                            onClick={() => toggleAttendance(student.id, student.timetable_entry_id, 'late')}
                          >
                            L
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="save-section">
            <button 
              onClick={saveAttendance} 
              className="btn-primary btn-large"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save All Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SchoolAttendance;
