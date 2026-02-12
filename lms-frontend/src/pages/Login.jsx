import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InteractiveBackground from '../components/InteractiveBackground';
import DatePicker from '../components/DatePicker';
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
    e.stopPropagation(); // Prevent any event bubbling
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      
      // Check if account is deactivated
      if (err.response?.data?.isDeactivated) {
        setError(err.response.data.message || 'Your account has been deactivated. Please contact your administrator.');
      } else {
        const errorMessage = err.response?.data?.error || 'Wrong email or password';
        setError(errorMessage);
      }
      
      setPassword(''); // Clear only password field
      setLoading(false);
      return false; // Prevent any default behavior
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
    // Format date to YYYY-MM-DD for URL
    const formattedDate = dateOfBirth instanceof Date 
      ? dateOfBirth.toISOString().split('T')[0]
      : dateOfBirth;
    // Navigate to unified parent portal
    navigate(`/parent/portal?name=${encodeURIComponent(childName.trim())}&dob=${formattedDate}`);
  };

  return (
    <>
      <InteractiveBackground />
      <div className="login-page">
        <div className="login-card">
        <h1>LMS</h1>
        
        <div className={`login-toggle ${isParentMode ? 'parent-mode' : ''}`}>
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
              <DatePicker
                selected={dateOfBirth ? (dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)) : null}
                onChange={(date) => setDateOfBirth(date)}
                placeholder="Select date of birth"
                required
                maxDate={new Date()}
              />
            </div>
            <button type="submit" className="btn-primary btn-full">
              View Progress
            </button>
          </form>
        )}
      </div>
    </div>
    </>
  );
};

export default Login;
