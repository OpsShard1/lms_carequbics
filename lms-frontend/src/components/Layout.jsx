import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../styles/layout.css';

const Layout = () => {
  const { user, logout, currentSection, switchSection, canAccessSection, selectedSchool, selectedCenter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarSettings, setSidebarSettings] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load sidebar visibility settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/settings');
        setSidebarSettings(res.data.sidebar_visibility || {});
      } catch (err) {
        // Use defaults if settings fail to load
        setSidebarSettings({
          school_section: true,
          center_section: true,
          school_dashboard: true,
          school_classes: true,
          school_students: true,
          school_timetable: true,
          school_attendance: true,
          center_dashboard: true,
          center_students: true,
          center_attendance: true,
          center_progress: true,
          center_curriculum: true,
          admin_users: true,
          admin_schools: true,
          admin_centers: true,
          admin_trainer_assignments: true,
          admin_teacher_assignments: true
        });
      }
    };
    loadSettings();
  }, []);

  // Developer, owner, and trainer_head always see everything
  const isAdminRole = ['developer', 'owner', 'trainer_head'].includes(user?.role_name);

  // Check if a menu item should be visible based on settings
  const isVisible = (settingKey) => {
    if (isAdminRole) return true; // Admin roles see all
    if (!sidebarSettings) return true; // Show all while loading
    return sidebarSettings[settingKey] !== false;
  };

  // Check if sections are enabled
  const schoolSectionEnabled = isVisible('school_section');
  const centerSectionEnabled = isVisible('center_section');

  // Determine if user can switch between sections (considering settings)
  const canSwitchSections = canAccessSection('school') && canAccessSection('center') && 
    schoolSectionEnabled && centerSectionEnabled;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSectionSwitch = (section) => {
    switchSection(section);
    navigate(section === 'school' ? '/school/dashboard' : '/center/dashboard');
    setIsMobileMenuOpen(false); // Close mobile menu after switching
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false); // Close mobile menu when navigating
  };

  const schoolMenuItems = [
    { path: '/school/dashboard', label: 'Dashboard', roles: ['developer', 'owner', 'principal', 'school_teacher', 'trainer_head', 'trainer'], settingKey: 'school_dashboard' },
    { path: '/school/classes', label: 'Classes', roles: ['developer', 'owner', 'school_teacher', 'trainer_head'], settingKey: 'school_classes' },
    { path: '/school/students', label: 'Students', roles: ['developer', 'owner', 'school_teacher', 'principal', 'trainer', 'trainer_head'], settingKey: 'school_students' },
    { path: '/school/curriculum', label: 'Curriculum', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'school_curriculum' },
    { path: '/school/class-progress', label: 'Class Progress', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'school_class_progress' },
    { path: '/school/timetable', label: 'Timetable', roles: ['developer', 'owner', 'school_teacher', 'trainer', 'trainer_head'], settingKey: 'school_timetable' },
    { path: '/school/attendance', label: 'Attendance', roles: ['developer', 'owner', 'trainer', 'trainer_head'], settingKey: 'school_attendance' },
  ];

  const centerMenuItems = [
    { path: '/center/dashboard', label: 'Dashboard', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'center_dashboard' },
    { path: '/center/students', label: 'Students', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'center_students' },
    { path: '/center/attendance', label: 'Attendance', roles: ['developer', 'owner', 'trainer', 'trainer_head'], settingKey: 'center_attendance' },
    { path: '/center/progress', label: 'Progress', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'center_progress' },
    { path: '/center/curriculum', label: 'Curriculum', roles: ['developer', 'owner', 'trainer_head'], settingKey: 'center_curriculum' },
    { path: '/center/fees', label: 'Fees', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'center_fees' },
  ];

  const adminMenuItems = [
    { path: '/admin/users', label: 'Users', roles: ['developer', 'owner', 'trainer_head'], settingKey: 'admin_users' },
    { path: '/admin/schools', label: 'Schools', roles: ['developer', 'owner', 'trainer_head'], settingKey: 'admin_schools' },
    { path: '/admin/centers', label: 'Centers', roles: ['developer', 'owner', 'trainer_head'], settingKey: 'admin_centers' },
    { path: '/admin/trainer-assignments', label: 'Trainer Assignments', roles: ['developer', 'owner', 'trainer_head'], settingKey: 'admin_trainer_assignments' },
    { path: '/admin/teacher-assignments', label: 'Teacher Assignments', roles: ['developer', 'owner', 'trainer_head'], settingKey: 'admin_teacher_assignments' },
    { path: '/admin/settings', label: 'Settings', roles: ['developer'], settingKey: null }, // Always visible for developer
  ];

  // Filter menu items by role AND visibility settings
  const filterMenuItems = (items) => {
    return items.filter(item => {
      const hasRole = item.roles.includes(user?.role_name);
      const isItemVisible = item.settingKey === null || isVisible(item.settingKey);
      return hasRole && isItemVisible;
    });
  };

  // Determine which section to show based on settings
  let effectiveSection = currentSection;
  if (!isAdminRole) {
    if (currentSection === 'school' && !schoolSectionEnabled && centerSectionEnabled) {
      effectiveSection = 'center';
    } else if (currentSection === 'center' && !centerSectionEnabled && schoolSectionEnabled) {
      effectiveSection = 'school';
    }
  }

  const menuItems = effectiveSection === 'school' ? schoolMenuItems : centerMenuItems;
  const filteredMenu = filterMenuItems(menuItems);
  const filteredAdmin = filterMenuItems(adminMenuItems);

  const isActive = (path) => location.pathname === path;

  // Show only enabled section buttons
  const showSchoolButton = isAdminRole || (canAccessSection('school') && schoolSectionEnabled);
  const showCenterButton = isAdminRole || (canAccessSection('center') && centerSectionEnabled);

  return (
    <div className="app-layout">
      <header className="header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <span className="hamburger-icon">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <h1 className="logo">LMS</h1>
          {(showSchoolButton && showCenterButton) && (
            <div className="section-switcher">
              {showSchoolButton && (
                <button 
                  className={`section-btn ${effectiveSection === 'school' ? 'active' : ''}`}
                  onClick={() => handleSectionSwitch('school')}
                >
                  School
                </button>
              )}
              {showCenterButton && (
                <button 
                  className={`section-btn ${effectiveSection === 'center' ? 'active' : ''}`}
                  onClick={() => handleSectionSwitch('center')}
                >
                  Center
                </button>
              )}
            </div>
          )}
        </div>
        <div className="header-right">
          <span className="current-entity">
            {effectiveSection === 'school' ? selectedSchool?.name : selectedCenter?.name}
          </span>
          <span className="user-info">{user?.first_name} ({user?.role_name})</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <div className="main-container">
        <nav className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Mobile header inside sidebar */}
          <div className="mobile-sidebar-header">
            <div className="mobile-user-info">
              <div className="mobile-user-name">{user?.first_name}</div>
              <div className="mobile-user-role">{user?.role_name}</div>
            </div>
            {(showSchoolButton && showCenterButton) && (
              <div className="mobile-section-switcher">
                {showSchoolButton && (
                  <button 
                    className={`mobile-section-btn ${effectiveSection === 'school' ? 'active' : ''}`}
                    onClick={() => handleSectionSwitch('school')}
                  >
                    School
                  </button>
                )}
                {showCenterButton && (
                  <button 
                    className={`mobile-section-btn ${effectiveSection === 'center' ? 'active' : ''}`}
                    onClick={() => handleSectionSwitch('center')}
                  >
                    Center
                  </button>
                )}
              </div>
            )}
          </div>

          <ul className="nav-menu">
            {filteredMenu.map(item => (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={isActive(item.path) ? 'active' : ''}
                  onClick={handleNavClick}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {filteredAdmin.length > 0 && (
              <>
                <li className="nav-divider">Admin</li>
                {filteredAdmin.map(item => (
                  <li key={item.path}>
                    <Link 
                      to={item.path} 
                      className={isActive(item.path) ? 'active' : ''}
                      onClick={handleNavClick}
                    >
                      {item.label}
                    </Link>
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
