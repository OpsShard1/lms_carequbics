import '../styles/unassigned-user.css';

const UnassignedUser = ({ user }) => {
  // Determine what the user needs based on their role
  const getAssignmentMessage = () => {
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

  const { title, message, instruction } = getAssignmentMessage();

  return (
    <div className="unassigned-user-container">
      <div className="unassigned-user-card">
        <div className="unassigned-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
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
        </div>
        
        <div className="unassigned-footer">
          <p>Need help? Contact your system administrator</p>
        </div>
      </div>
    </div>
  );
};

export default UnassignedUser;
