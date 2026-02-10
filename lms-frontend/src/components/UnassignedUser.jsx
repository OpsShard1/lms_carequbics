import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/unassigned-user.css';

const UnassignedUser = ({ user }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine what the user needs based on their role and status
  const getAssignmentMessage = () => {
    // Check if user is deactivated
    if (user?.is_active === false || user?.is_active === 0) {
      return {
        title: 'Account Deactivated',
        message: 'Your account has been deactivated by an administrator.',
        instruction: 'Please contact your administrator or the company to reactivate your account.',
        isDeactivated: true
      };
    }

    const roleName = user?.role_name;
    
    switch (roleName) {
      case 'school_teacher':
        return {
          title: 'No School Assignment',
          message: 'You have not been assigned to any school yet.',
          instruction: 'Please contact your administrator or the company to get assigned to a school.'
        };
      case 'principal':
        return {
          title: 'No School Assignment',
          message: 'You have not been assigned to any school yet.',
          instruction: 'Please contact your administrator or the company to get assigned to a school.'
        };
      case 'registrar':
        return {
          title: 'No Center Assignment',
          message: 'You have not been assigned to any training center yet.',
          instruction: 'Please contact your administrator or the company to get assigned to a center.'
        };
      case 'trainer':
        return {
          title: 'No Assignment',
          message: 'You have not been assigned to any school or training center yet.',
          instruction: 'Please contact your administrator or the company to get assigned to a school or center.'
        };
      case 'trainer_head':
        return {
          title: 'No Assignment',
          message: 'You have not been assigned to any school or training center yet.',
          instruction: 'Please contact your administrator or the company to get assigned based on your section access.'
        };
      default:
        return {
          title: 'No Assignment',
          message: 'You have not been assigned to any location yet.',
          instruction: 'Please contact your administrator or the company for assistance.'
        };
    }
  };

  const { title, message, instruction, isDeactivated } = getAssignmentMessage();

  return (
    <div className="unassigned-user-container">
      <div className={`unassigned-user-card ${isDeactivated ? 'deactivated' : ''}`}>
        <button onClick={handleLogout} className="unassigned-logout-btn" title="Logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className={`unassigned-icon ${isDeactivated ? 'deactivated-icon' : ''}`}>
          {isDeactivated ? (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
              <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
          )}
        </div>
        
        <h2 className="unassigned-title">{title}</h2>
        <p className="unassigned-message">{message}</p>
        <p className="unassigned-instruction">{instruction}</p>
        
        <div className="unassigned-info-box">
          <div className="info-row">
            <span className="info-label">Your Role:</span>
            <span className="info-value">{user?.role_name?.replace('_', ' ')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value info-email">{user?.email}</span>
          </div>
          {isDeactivated && (
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value deactivated-status">Deactivated</span>
            </div>
          )}
        </div>
        
        <div className="unassigned-footer">
          <p>Need help? Contact your system administrator</p>
        </div>
      </div>
    </div>
  );
};

export default UnassignedUser;
