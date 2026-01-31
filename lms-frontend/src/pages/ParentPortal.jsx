import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import ParentProgress from './ParentProgress';
import SchoolParentProgress from './SchoolParentProgress';
import '../styles/parent-progress.css';

const ParentPortal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentType, setStudentType] = useState(null);
  const [error, setError] = useState('');

  const studentName = searchParams.get('name');
  const dateOfBirth = searchParams.get('dob');

  useEffect(() => {
    if (studentName && dateOfBirth) {
      detectStudentType();
    } else {
      navigate('/login');
    }
  }, [studentName, dateOfBirth]);

  const detectStudentType = async () => {
    setLoading(true);
    setError('');
    try {
      // Try to detect student type
      const res = await api.post('/progress/detect-student-type', {
        student_name: studentName,
        date_of_birth: dateOfBirth
      });
      setStudentType(res.data.student_type);
    } catch (err) {
      setError(err.response?.data?.error || 'Student not found. Please check the name and date of birth.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="parent-progress-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-progress-page">
        <div className="error-container">
          <div className="error-icon">😕</div>
          <h2>Student Not Found</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Render appropriate component based on student type
  if (studentType === 'center') {
    return <ParentProgress />;
  } else if (studentType === 'school') {
    return <SchoolParentProgress />;
  }

  return null;
};

export default ParentPortal;
