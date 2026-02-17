import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InteractiveBackground from '../components/InteractiveBackground';
import PhoneInput from '../components/PhoneInput';
import '../styles/login.css';

const Login = () => {
  const [isParentMode, setIsParentMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
    if (!childName.trim() || !phoneNumber) {
      setError('Please enter child name and phone number');
      return;
    }
    // Navigate to unified parent portal
    navigate(`/parent/portal?name=${encodeURIComponent(childName.trim())}&phone=${encodeURIComponent(phoneNumber)}`);
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
              <label>Phone Number</label>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="Enter phone number"
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
    </>
  );
};

export default Login;
