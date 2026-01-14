import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const CenterDashboard = () => {
  const { selectedCenter, selectCenter, user } = useAuth();
  const [centers, setCenters] = useState([]);
  const [stats, setStats] = useState({ students: 0 });

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      loadStats();
    }
  }, [selectedCenter]);

  const loadCenters = async () => {
    try {
      const res = await api.get('/centers');
      setCenters(res.data);
      if (!selectedCenter && res.data.length > 0) {
        selectCenter(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load centers:', err);
    }
  };

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
        {centers.length > 1 && (
          <select 
            value={selectedCenter?.id || ''} 
            onChange={(e) => {
              const center = centers.find(c => c.id === parseInt(e.target.value));
              selectCenter(center);
            }}
            className="center-selector"
          >
            {centers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {selectedCenter ? (
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
