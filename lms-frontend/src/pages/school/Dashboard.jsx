import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const SchoolDashboard = () => {
  const { selectedSchool, selectSchool, user, availableSchools } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-select first school if none selected and schools are available
    if (availableSchools.length > 0 && !selectedSchool) {
      selectSchool(availableSchools[0]);
    }
    setLoading(false);
  }, [availableSchools, selectedSchool]);

  useEffect(() => {
    if (selectedSchool?.id) {
      loadStats();
    }
  }, [selectedSchool]);

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

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2>School Dashboard</h2>
      </div>

      {availableSchools.length === 0 ? (
        <div className="welcome-message">
          <h3>No Schools Assigned</h3>
          <p>You don't have access to any schools. Please contact admin.</p>
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
