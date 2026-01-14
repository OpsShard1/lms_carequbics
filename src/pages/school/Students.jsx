import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const SchoolStudents = () => {
  const { selectedSchool, selectSchool } = useAuth();
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool?.id) {
      loadStudents();
      loadClasses();
    }
  }, [selectedSchool]);

  const loadSchools = async () => {
    try {
      const res = await api.get('/schools');
      setSchools(res.data);
      if (res.data.length > 0 && !selectedSchool) {
        selectSchool(res.data[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load schools:', err);
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedSchool?.id) return;
    try {
      const res = await api.get(`/students/school/${selectedSchool.id}`);
      setStudents(res.data);
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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="students-page">
      <div className="page-header">
        <div>
          <h2>School Students</h2>
          <p className="subtitle">Students are managed through Classes. Go to Classes to add/edit students.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedSchool?.id || ''} 
            onChange={(e) => {
              const school = schools.find(s => s.id === parseInt(e.target.value));
              selectSchool(school);
            }}
            className="school-selector"
          >
            <option value="">Select School</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedSchool ? (
        <div className="welcome-message">
          <h3>Select a School</h3>
          <p>Please select a school to view students.</p>
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
              <h3>{students.length}</h3>
              <p>Total Students</p>
            </div>
            <div className="stat-card">
              <h3>{classes.length}</h3>
              <p>Classes</p>
            </div>
            <div className="stat-card">
              <h3>{students.filter(s => s.class_id).length}</h3>
              <p>Assigned to Class</p>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="no-data">
              <p>No students found.</p>
              <p className="hint">Go to Classes → Create Class to add students.</p>
            </div>
          ) : (
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
          )}
        </>
      )}
    </div>
  );
};

export default SchoolStudents;
