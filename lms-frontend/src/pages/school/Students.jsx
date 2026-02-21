import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import api from '../../api/axios';

const SchoolStudents = () => {
  const { selectedSchool, selectSchool, availableSchools } = useAuth();
  const { showSuccess, showWarning } = useNotificationContext();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-select first school if none selected
    if (availableSchools.length > 0 && !selectedSchool) {
      selectSchool(availableSchools[0]);
    }
    setLoading(false);
  }, [availableSchools, selectedSchool]);

  useEffect(() => {
    if (selectedSchool?.id) {
      loadStudents();
      loadClasses();
    }
  }, [selectedSchool]);

  const loadStudents = async () => {
    if (!selectedSchool?.id) return;
    try {
      const res = await api.get(`/students/school/${selectedSchool.id}`);
      // Filter out inactive students (backend should already do this, but double-check)
      const activeStudents = res.data.filter(s => s.is_active !== false && s.is_active !== 0);
      setStudents(activeStudents);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadClasses = async () => {
    if (!selectedSchool?.id) return;
    try {
      const res = await api.get(`/classes/school/${selectedSchool.id}`);
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const filteredStudents = filterClass 
    ? students.filter(s => s.class_id === parseInt(filterClass))
    : students;

  // Group students by class
  const studentsByClass = {};
  students.forEach(s => {
    const className = s.class_name || 'Unassigned';
    if (!studentsByClass[className]) {
      studentsByClass[className] = [];
    }
    studentsByClass[className].push(s);
  });

  const handleExportAllStudents = () => {
    if (!selectedSchool || students.length === 0) {
      showWarning('No students to export');
      return;
    }

    // Create CSV header with school info
    let csvContent = `School: ${selectedSchool.name}\n`;
    csvContent += `Total Students: ${students.length}\n`;
    csvContent += `Total Classes: ${classes.length}\n`;
    csvContent += `Export Date: ${new Date().toLocaleDateString()}\n\n`;

    // Group students by class and export
    const classGroups = {};
    students.forEach(student => {
      const className = student.class_name || 'Unassigned';
      if (!classGroups[className]) {
        classGroups[className] = [];
      }
      classGroups[className].push(student);
    });

    // Export each class
    Object.keys(classGroups).sort().forEach(className => {
      const classStudents = classGroups[className];
      
      csvContent += `\nClass: ${className}\n`;
      csvContent += `Students: ${classStudents.length}\n`;
      csvContent += 'First Name,Last Name,Date of Birth,Gender,Parent Name,Parent Contact,Status\n';
      
      classStudents.forEach(student => {
        const dob = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '';
        const status = student.is_extra === 1 || student.is_extra === true 
          ? 'Pending Approval' 
          : student.is_extra === 2 
          ? 'Rejected' 
          : 'Approved';
        
        csvContent += `${student.first_name || ''},${student.last_name || ''},${dob},${student.gender || ''},${student.parent_name || ''},${student.parent_contact || ''},${status}\n`;
      });
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Create filename: SchoolName_AllStudents_Date.csv
    const schoolName = selectedSchool.name.replace(/[^a-z0-9]/gi, '_');
    const date = new Date().toISOString().split('T')[0];
    a.download = `${schoolName}_AllStudents_${date}.csv`;
    
    a.click();
    window.URL.revokeObjectURL(url);
    showSuccess(`Exported ${students.length} students from ${Object.keys(classGroups).length} classes`);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="students-page school-students-page">
      <div className="page-header">
        <div>
          <h2>School Students</h2>
          <p className="subtitle">Students are managed through Classes. Go to Classes to add/edit students.</p>
        </div>
        {selectedSchool && students.length > 0 && (
          <button 
            onClick={handleExportAllStudents} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'white',
              border: '2px solid #10b981',
              borderRadius: '10px',
              color: '#10b981',
              fontSize: '0.9375rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#10b981';
              e.target.style.color = 'white';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.color = '#10b981';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            📥 Export All Students
          </button>
        )}
      </div>

      {!selectedSchool ? (
        <div className="welcome-message">
          <h3>Select a School</h3>
          <p>Please select a school from the navbar to view students.</p>
        </div>
      ) : (
        <>
          <div className="filters">
            <div className="form-group">
              <label>Filter by Class</label>
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - Grade {c.grade}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>{filteredStudents.length}</h3>
              <p>Total Students</p>
            </div>
            <div className="stat-card">
              <h3>{classes.length}</h3>
              <p>Classes</p>
            </div>
            <div className="stat-card">
              <h3>{filteredStudents.filter(s => s.class_id).length}</h3>
              <p>Assigned to Class</p>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="no-data">
              <p>No students found.</p>
              <p className="hint">Go to Classes → Create Class to add students.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Grade</th>
                    <th>DOB</th>
                    <th>Gender</th>
                    <th>Parent</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.first_name} {s.last_name}</strong></td>
                      <td>{s.class_name || <span style={{color: '#94a3b8'}}>Unassigned</span>}</td>
                      <td>{s.grade || '-'}</td>
                      <td>{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '-'}</td>
                      <td>{s.gender || '-'}</td>
                      <td>{s.parent_name || '-'}</td>
                      <td>{s.parent_contact || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SchoolStudents;
