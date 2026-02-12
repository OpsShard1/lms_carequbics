import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';
import NotificationContainer from './NotificationContainer';
import UnassignedUser from './UnassignedUser';
import api from '../api/axios';
import '../styles/layout.css';

const Layout = () => {
  const { user, logout, currentSection, switchSection, canAccessSection, selectedSchool, selectedCenter, selectSchool, selectCenter, availableSchools, availableCenters, ownerEditMode, toggleOwnerEditMode } = useAuth();
  const { notifications, removeNotification, showWarning } = useNotificationContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarSettings, setSidebarSettings] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);

  // Check if user needs assignments based on their role
  const needsAssignment = () => {
    if (!user) return false;
    
    // Roles that don't need assignments (they have global access)
    const rolesWithoutAssignments = ['developer', 'owner', 'super_admin'];
    if (rolesWithoutAssignments.includes(user.role_name)) {
      return false;
    }
    
    // Check if user has any assignments based on their role
    const roleName = user.role_name;
    
    if (roleName === 'school_teacher' || roleName === 'principal') {
      // These roles need at least one school assignment
      return availableSchools.length === 0;
    }
    
    if (roleName === 'registrar') {
      // Registrars need at least one center assignment
      return availableCenters.length === 0;
    }
    
    if (roleName === 'trainer' || roleName === 'trainer_head') {
      // Trainers need at least one school OR center assignment
      return availableSchools.length === 0 && availableCenters.length === 0;
    }
    
    return false;
  };

  // If user needs assignment, show the unassigned user screen
  if (needsAssignment()) {
    return (
      <>
        <UnassignedUser user={user} />
        <NotificationContainer 
          notifications={notifications} 
          onRemove={removeNotification} 
        />
      </>
    );
  }

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
          school_curriculum: true,
          school_class_progress: true,
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
          admin_school_assignments: true
        });
      }
    };
    loadSettings();
  }, []);

  // Only super_admin bypasses sidebar settings (can see everything)
  const isAdminRole = user?.role_name === 'super_admin';

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

  const handleEditModeToggle = () => {
    if (!ownerEditMode) {
      // Turning ON edit mode - show warning
      showWarning('Edit Mode Enabled: You can now make changes to the system. Please be careful with your modifications.');
    }
    toggleOwnerEditMode();
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false); // Close mobile menu when navigating
  };

  const schoolMenuItems = [
    { path: '/school/dashboard', label: 'Dashboard', roles: ['developer', 'owner', 'principal', 'school_teacher', 'trainer_head', 'trainer'], settingKey: 'school_dashboard' },
    { path: '/school/classes', label: 'Classes', roles: ['developer', 'owner', 'school_teacher', 'principal', 'trainer_head', 'trainer'], settingKey: 'school_classes' },
    { path: '/school/students', label: 'Students', roles: ['developer', 'owner', 'school_teacher', 'principal', 'trainer', 'trainer_head'], settingKey: 'school_students' },
    { path: '/school/curriculum', label: 'Curriculum', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'school_curriculum' },
    { path: '/school/class-progress', label: 'Class Progress', roles: ['developer', 'owner', 'principal', 'trainer_head', 'trainer'], settingKey: 'school_class_progress' },
    { path: '/school/timetable', label: 'Timetable', roles: ['developer', 'owner', 'school_teacher', 'principal', 'trainer', 'trainer_head'], settingKey: 'school_timetable' },
    { path: '/school/attendance', label: 'Attendance', roles: ['developer', 'owner', 'principal', 'trainer', 'trainer_head'], settingKey: 'school_attendance' },
  ];

  const centerMenuItems = [
    { path: '/center/dashboard', label: 'Dashboard', roles: ['developer', 'owner', 'trainer_head', 'trainer', 'registrar'], settingKey: 'center_dashboard' },
    { path: '/center/students', label: 'Students', roles: ['developer', 'owner', 'trainer_head', 'trainer', 'registrar'], settingKey: 'center_students' },
    { path: '/center/attendance', label: 'Attendance', roles: ['developer', 'owner', 'trainer', 'trainer_head', 'registrar'], settingKey: 'center_attendance' },
    { path: '/center/progress', label: 'Progress', roles: ['developer', 'owner', 'trainer_head', 'trainer'], settingKey: 'center_progress' },
    { path: '/center/curriculum', label: 'Curriculum', roles: ['developer', 'owner', 'trainer_head'], settingKey: 'center_curriculum' },
    { path: '/center/fees', label: 'Fees', roles: ['developer', 'owner', 'trainer_head', 'registrar'], settingKey: 'center_fees' },
  ];

  const adminMenuItems = [
    { path: '/admin/users', label: 'Users', roles: ['developer', 'owner', 'super_admin', 'trainer_head'], settingKey: 'admin_users' },
    { path: '/admin/schools', label: 'Schools', roles: ['developer', 'owner', 'super_admin', 'trainer_head'], settingKey: 'admin_schools' },
    { path: '/admin/centers', label: 'Centers', roles: ['developer', 'owner', 'super_admin', 'trainer_head'], settingKey: 'admin_centers' },
    { path: '/admin/settings', label: 'Settings', roles: ['super_admin'], settingKey: null }, // Only super_admin can see settings
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
          <button 
            className={`mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}`} 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
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
          <div className="entity-selector">
            <button 
              className="current-entity"
              onClick={() => setShowEntityDropdown(!showEntityDropdown)}
            >
              <span className="entity-name">
                {effectiveSection === 'school' ? selectedSchool?.name : selectedCenter?.name}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {showEntityDropdown && (
              <>
                <div className="dropdown-overlay" onClick={() => setShowEntityDropdown(false)}></div>
                <div className="entity-dropdown">
                  <div className="dropdown-header">
                    {effectiveSection === 'school' ? 'Select School' : 'Select Center'}
                  </div>
                  <div className="dropdown-list">
                    {effectiveSection === 'school' ? (
                      availableSchools.map(school => (
                        <button
                          key={school.id}
                          className={`dropdown-item ${selectedSchool?.id === school.id ? 'active' : ''}`}
                          onClick={() => {
                            selectSchool(school);
                            setShowEntityDropdown(false);
                          }}
                        >
                          {school.name}
                          {selectedSchool?.id === school.id && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      ))
                    ) : (
                      availableCenters.map(center => (
                        <button
                          key={center.id}
                          className={`dropdown-item ${selectedCenter?.id === center.id ? 'active' : ''}`}
                          onClick={() => {
                            selectCenter(center);
                            setShowEntityDropdown(false);
                          }}
                        >
                          {center.name}
                          {selectedCenter?.id === center.id && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {user?.role_name === 'owner' && (
            <div className="edit-mode-toggle">
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={ownerEditMode} 
                  onChange={handleEditModeToggle}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className={`toggle-label ${ownerEditMode ? 'active' : ''}`}>
                {ownerEditMode ? 'Edit Mode' : 'View Only'}
              </span>
            </div>
          )}
          <span className="user-info">{user?.first_name} ({user?.role_name})</span>
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
          
          <div className="sidebar-footer">
            <button onClick={handleLogout} className="logout-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Logout
            </button>
          </div>
        </nav>

        <main className="content">
          <Outlet />
        </main>
      </div>
      
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
};

export default Layout;
