import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [currentSection, setCurrentSection] = useState('school');
  const [availableSchools, setAvailableSchools] = useState([]);
  const [availableCenters, setAvailableCenters] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      
      // Restore selections
      const savedSchool = localStorage.getItem('selectedSchool');
      const savedCenter = localStorage.getItem('selectedCenter');
      const savedSection = localStorage.getItem('currentSection');
      
      if (savedSchool) setSelectedSchool(JSON.parse(savedSchool));
      if (savedCenter) setSelectedCenter(JSON.parse(savedCenter));
      if (savedSection) setCurrentSection(savedSection);
      
      // Load available schools/centers based on role
      loadAvailableEntities(parsedUser);
    }
    setLoading(false);
  }, []);

  const loadAvailableEntities = async (userData) => {
    try {
      // Trainers and Registrars get their assigned schools/centers from trainer_assignments table
      if (userData.role_name === 'trainer' || userData.role_name === 'registrar') {
        const [schoolsRes, centersRes] = await Promise.all([
          api.get('/staff-assignments/my-schools'),
          api.get('/staff-assignments/my-centers')
        ]);
        const schools = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
        const centers = Array.isArray(centersRes.data) ? centersRes.data : [];
        
        // Registrars only have center access
        if (userData.role_name === 'registrar') {
          setAvailableSchools([]);
          setAvailableCenters(centers);
          
          if (centers.length > 0 && !localStorage.getItem('selectedCenter')) {
            selectCenter(centers[0]);
          }
          
          setCurrentSection('center');
          localStorage.setItem('currentSection', 'center');
        } else {
          // Trainers can have both
          setAvailableSchools(schools);
          setAvailableCenters(centers);
          
          // Auto-select first available and set section based on what's available
          if (schools.length > 0 && !localStorage.getItem('selectedSchool')) {
            selectSchool(schools[0]);
          }
          if (centers.length > 0 && !localStorage.getItem('selectedCenter')) {
            selectCenter(centers[0]);
          }
          
          // Set default section based on what trainer has access to
          if (!localStorage.getItem('currentSection')) {
            if (schools.length > 0) {
              setCurrentSection('school');
              localStorage.setItem('currentSection', 'school');
            } else if (centers.length > 0) {
              setCurrentSection('center');
              localStorage.setItem('currentSection', 'center');
            }
          }
        }
      } else if (userData.role_name === 'school_teacher') {
        // School teachers get their assigned schools from user_assignments/teacher-assignments
        const schoolsRes = await api.get('/teacher-assignments/my-schools');
        const schools = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
        setAvailableSchools(schools);
        setAvailableCenters([]); // Teachers don't have center access
        
        // Auto-select first school
        if (schools.length > 0 && !localStorage.getItem('selectedSchool')) {
          selectSchool(schools[0]);
        }
        
        // Teachers only have school section
        setCurrentSection('school');
        localStorage.setItem('currentSection', 'school');
      } else if (userData.role_name && userData.role_name.includes('principal')) {
        // Principals get their assigned schools from user_assignments
        const schoolsRes = await api.get('/teacher-assignments/my-schools');
        const schools = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
        setAvailableSchools(schools);
        setAvailableCenters([]); // Principals don't have center access
        
        // Auto-select first school
        if (schools.length > 0 && !localStorage.getItem('selectedSchool')) {
          selectSchool(schools[0]);
        }
        
        // Principals only have school section
        setCurrentSection('school');
        localStorage.setItem('currentSection', 'school');
      } else if (['developer', 'owner'].includes(userData.role_name)) {
        // Developer and owner get ALL schools and centers
        const [schoolsRes, centersRes] = await Promise.all([
          api.get('/schools'),
          api.get('/centers')
        ]);
        const schools = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
        const centers = Array.isArray(centersRes.data) ? centersRes.data : [];
        setAvailableSchools(schools);
        setAvailableCenters(centers);
        
        // Auto-select first if not already selected
        if (schools.length > 0 && !localStorage.getItem('selectedSchool')) {
          selectSchool(schools[0]);
        }
        if (centers.length > 0 && !localStorage.getItem('selectedCenter')) {
          selectCenter(centers[0]);
        }
      } else if (userData.role_name === 'trainer_head') {
        // Trainer_head gets schools/centers based on their section_type
        let schools = [];
        let centers = [];
        
        if (userData.section_type === 'school' || userData.section_type === 'both') {
          const schoolsRes = await api.get('/schools');
          schools = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
        }
        
        if (userData.section_type === 'center' || userData.section_type === 'both') {
          const centersRes = await api.get('/centers');
          centers = Array.isArray(centersRes.data) ? centersRes.data : [];
        }
        
        setAvailableSchools(schools);
        setAvailableCenters(centers);
        
        // Auto-select first if not already selected
        if (schools.length > 0 && !localStorage.getItem('selectedSchool')) {
          selectSchool(schools[0]);
        }
        if (centers.length > 0 && !localStorage.getItem('selectedCenter')) {
          selectCenter(centers[0]);
        }
        
        // Set default section based on section_type
        if (!localStorage.getItem('currentSection')) {
          if (userData.section_type === 'school') {
            setCurrentSection('school');
            localStorage.setItem('currentSection', 'school');
          } else if (userData.section_type === 'center') {
            setCurrentSection('center');
            localStorage.setItem('currentSection', 'center');
          } else if (userData.section_type === 'both' && schools.length > 0) {
            setCurrentSection('school');
            localStorage.setItem('currentSection', 'school');
          } else if (userData.section_type === 'both' && centers.length > 0) {
            setCurrentSection('center');
            localStorage.setItem('currentSection', 'center');
          }
        }
      } else {
        // Other roles get from their user_assignments
        const schoolAssignments = userData.assignments?.filter(a => a.school_id) || [];
        const centerAssignments = userData.assignments?.filter(a => a.center_id) || [];
        
        setAvailableSchools(schoolAssignments.map(a => ({ id: a.school_id, name: a.school_name })));
        setAvailableCenters(centerAssignments.map(a => ({ id: a.center_id, name: a.center_name })));
        
        // Auto-select first
        if (schoolAssignments.length > 0 && !localStorage.getItem('selectedSchool')) {
          const school = { id: schoolAssignments[0].school_id, name: schoolAssignments[0].school_name };
          selectSchool(school);
        }
        if (centerAssignments.length > 0 && !localStorage.getItem('selectedCenter')) {
          const center = { id: centerAssignments[0].center_id, name: centerAssignments[0].center_name };
          selectCenter(center);
        }
      }
    } catch (err) {
      console.error('Failed to load available entities:', err);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    // Load available entities based on role
    await loadAvailableEntities(userData);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedSchool');
    localStorage.removeItem('selectedCenter');
    localStorage.removeItem('currentSection');
    setUser(null);
    setSelectedSchool(null);
    setSelectedCenter(null);
    setAvailableSchools([]);
    setAvailableCenters([]);
  };

  const selectSchool = (school) => {
    setSelectedSchool(school);
    localStorage.setItem('selectedSchool', JSON.stringify(school));
  };

  const selectCenter = (center) => {
    setSelectedCenter(center);
    localStorage.setItem('selectedCenter', JSON.stringify(center));
  };

  const switchSection = (section) => {
    setCurrentSection(section);
    localStorage.setItem('currentSection', section);
  };

  // Check if user can access a section based on their available schools/centers
  const canAccessSection = (section) => {
    if (!user) return false;
    
    // Registrars only have center access
    if (user.role_name === 'registrar') {
      return section === 'center' && availableCenters.length > 0;
    }
    
    // For trainers and trainer_head, check if they have assignments/access in that section
    if (user.role_name === 'trainer' || user.role_name === 'trainer_head') {
      if (section === 'school') return availableSchools.length > 0;
      if (section === 'center') return availableCenters.length > 0;
      return false;
    }
    
    // School teachers only have school access
    if (user.role_name === 'school_teacher') {
      return section === 'school' && availableSchools.length > 0;
    }
    
    // Principals only have school access
    if (user.role_name && user.role_name.includes('principal')) {
      return section === 'school' && availableSchools.length > 0;
    }
    
    // For other roles (developer, owner), use section_type
    return user.section_type === 'both' || user.section_type === section;
  };

  // Check if user can perform specific actions
  const canManageClasses = () => {
    if (!user) return false;
    return ['developer', 'school_teacher'].includes(user.role_name);
  };

  const canManageTimetable = () => {
    if (!user) return false;
    return ['developer', 'school_teacher'].includes(user.role_name);
  };

  const canMarkAttendance = () => {
    if (!user) return false;
    return ['developer', 'trainer', 'trainer_head'].includes(user.role_name);
  };

  const canAddExtraStudents = () => {
    if (!user) return false;
    return ['developer', 'trainer', 'trainer_head'].includes(user.role_name);
  };

  const canAssignTrainers = () => {
    if (!user) return false;
    return ['developer', 'owner', 'trainer_head'].includes(user.role_name);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    selectedSchool,
    selectedCenter,
    selectSchool,
    selectCenter,
    currentSection,
    switchSection,
    canAccessSection,
    availableSchools,
    availableCenters,
    canManageClasses,
    canManageTimetable,
    canMarkAttendance,
    canAddExtraStudents,
    canAssignTrainers,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
