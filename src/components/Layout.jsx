import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/layout.css';

const Layout = () => {
  const { user, logout, currentSection, switchSection, canAccessSection, selectedSchool, selectedCenter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSectionSwitch = (section) => {
    switchSection(section);
    // Navigate to the dashboard of the new section
    navigate(section === 'school' ? '/school/dashboard' : '/center/dashboard');
  };

  const schoolMenuItems = [
    { path: '/school/dashboard', label: 'Dashboard', roles: ['developer', 'owner', 'principal', 'school_teacher', 'trainer_head'] },
    { path: '/school/classes', label: 'Classes', roles: ['developer', 'owner', 'school_teacher'] },
    { path: '/school/students', label: 'Students', roles: ['developer', 'owner', 'school_teacher', 'principal'] },
    { path: '/school/timetable', label: 'Timetable', roles: ['developer', 'owner', 'school_teacher'] },
    { path: '/school/attendance', label: 'Attendance', roles: ['developer', 'owner', 'school_teacher', 'trainer', 'principal'] },
  ];

  const centerMenuItems = [
    { path: '/center/dashboard', label: 'Dashboard', roles: ['developer', 'owner', 'trainer_head', 'trainer'] },
    { path: '/center/students', label: 'Students', roles: ['developer', 'owner', 'trainer_head', 'trainer'] },
    { path: '/center/attendance', label: 'Attendance', roles: ['developer', 'owner', 'trainer_head', 'trainer'] },
    { path: '/center/progress', label: 'Progress', roles: ['developer', 'owner', 'trainer_head', 'trainer'] },
  ];

  const adminMenuItems = [
    { path: '/admin/users', label: 'Users', roles: ['developer', 'owner'] },
    { path: '/admin/schools', label: 'Schools', roles: ['developer', 'owner'] },
    { path: '/admin/centers', label: 'Centers', roles: ['developer', 'owner'] },
  ];

  const menuItems = currentSection === 'school' ? schoolMenuItems : centerMenuItems;
  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role_name));
  const filteredAdmin = adminMenuItems.filter(item => item.roles.includes(user?.role_name));

  // Check if current path is active
  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-layout">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">LMS</h1>
          {canAccessSection('school') && canAccessSection('center') && (
            <div className="section-switcher">
              <button 
                className={`section-btn ${currentSection === 'school' ? 'active' : ''}`}
                onClick={() => handleSectionSwitch('school')}
              >
                School
              </button>
              <button 
                className={`section-btn ${currentSection === 'center' ? 'active' : ''}`}
                onClick={() => handleSectionSwitch('center')}
              >
                Center
              </button>
            </div>
          )}
        </div>
        <div className="header-right">
          <span className="current-entity">
            {currentSection === 'school' ? selectedSchool?.name : selectedCenter?.name}
          </span>
          <span className="user-info">{user?.first_name} ({user?.role_name})</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="main-container">
        <nav className="sidebar">
          <ul className="nav-menu">
            {filteredMenu.map(item => (
              <li key={item.path}>
                <Link to={item.path} className={isActive(item.path) ? 'active' : ''}>{item.label}</Link>
              </li>
            ))}
            {filteredAdmin.length > 0 && (
              <>
                <li className="nav-divider">Admin</li>
                {filteredAdmin.map(item => (
                  <li key={item.path}>
                    <Link to={item.path} className={isActive(item.path) ? 'active' : ''}>{item.label}</Link>
                  </li>
                ))}
              </>
            )}
          </ul>
        </nav>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
