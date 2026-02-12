import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const CenterDashboard = () => {
  const { selectedCenter, selectCenter, user, availableCenters } = useAuth();
  const [stats, setStats] = useState({ students: 0 });

  useEffect(() => {
    // Auto-select first center if none selected and centers are available
    if (availableCenters.length > 0 && !selectedCenter) {
      selectCenter(availableCenters[0]);
    }
  }, [availableCenters, selectedCenter]);

  useEffect(() => {
    if (selectedCenter) {
      loadStats();
    }
  }, [selectedCenter]);

  const loadStats = async () => {
    try {
      const studentsRes = await api.get(`/students/center/${selectedCenter.id}`);
      setStats({ students: studentsRes.data.length });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2>Center Dashboard</h2>
      </div>

      {availableCenters.length === 0 ? (
        <div className="welcome-message">
          <h3>No Centers Assigned</h3>
          <p>You don't have access to any centers. Please contact admin.</p>
        </div>
      ) : selectedCenter ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.students}</h3>
              <p>Students</p>
            </div>
          </div>
          <div className="welcome-message">
            <h3>Welcome, {user?.first_name}!</h3>
            <p>Managing: {selectedCenter.name}</p>
          </div>
        </>
      ) : (
        <p>No center selected. Please contact admin to assign you to a center.</p>
      )}
    </div>
  );
};

export default CenterDashboard;
