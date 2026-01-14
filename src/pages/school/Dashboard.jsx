import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const SchoolDashboard = () => {
  const { selectedSchool, selectSchool, user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState({ classes: 0, students: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool?.id) {
      loadStats();
    }
  }, [selectedSchool]);

  const loadSchools = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/schools');
      console.log('Loaded schools:', res.data);
      setSchools(res.data);
      
      // Auto-select first school if none selected
      if (res.data.length > 0 && !selectedSchool) {
        selectSchool(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load schools:', err);
      setError('Failed to load schools: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!selectedSchool?.id) return;
    try {
      const [classesRes, studentsRes] = await Promise.all([
        api.get(`/classes/school/${selectedSchool.id}`),
        api.get(`/students/school/${selectedSchool.id}`)
      ]);
      setStats({
        classes: classesRes.data.length,
        students: studentsRes.data.length
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2>School Dashboard</h2>
        {schools.length > 0 && (
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
        )}
      </div>

      {schools.length === 0 ? (
        <div className="welcome-message">
          <h3>No Schools Found</h3>
          <p>Go to Admin → Schools to create your first school.</p>
        </div>
      ) : selectedSchool ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.classes}</h3>
              <p>Classes</p>
            </div>
            <div className="stat-card">
              <h3>{stats.students}</h3>
              <p>Students</p>
            </div>
          </div>
          <div className="welcome-message">
            <h3>Welcome, {user?.first_name}!</h3>
            <p>Managing: {selectedSchool.name}</p>
          </div>
        </>
      ) : (
        <div className="welcome-message">
          <h3>Select a School</h3>
          <p>Please select a school from the dropdown above.</p>
        </div>
      )}
    </div>
  );
};

export default SchoolDashboard;
