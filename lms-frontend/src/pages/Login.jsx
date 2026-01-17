import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

const Login = () => {
  const [isParentMode, setIsParentMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleParentLogin = (e) => {
    e.preventDefault();
    if (!childName.trim() || !dateOfBirth) {
      setError('Please enter child name and date of birth');
      return;
    }
    // Navigate to parent progress page with query params
    navigate(`/parent/progress?name=${encodeURIComponent(childName.trim())}&dob=${dateOfBirth}`);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>LMS</h1>
        
        <div className="login-toggle">
          <button 
            className={`toggle-btn ${!isParentMode ? 'active' : ''}`}
            onClick={() => { setIsParentMode(false); setError(''); }}
          >
            Staff Login
          </button>
          <button 
            className={`toggle-btn ${isParentMode ? 'active' : ''}`}
            onClick={() => { setIsParentMode(true); setError(''); }}
          >
            Parent Portal
          </button>
        </div>

        {!isParentMode ? (
          <form onSubmit={handleStaffLogin}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary btn-full">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleParentLogin}>
            {error && <div className="error-message">{error}</div>}
            <p className="parent-info">
              View your child's learning progress and attendance by entering their details below.
            </p>
            <div className="form-group">
              <label>Child's Full Name</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g., Aditya Verma"
                required
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary btn-full">
              View Progress
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
