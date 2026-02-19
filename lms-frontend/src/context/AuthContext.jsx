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
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [currentSection, setCurrentSection] = useState('school');
  const [availableSchools, setAvailableSchools] = useState([]);
  const [availableCenters, setAvailableCenters] = useState([]);
  const [ownerEditMode, setOwnerEditMode] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Restore selections
          const savedSchool = localStorage.getItem('selectedSchool');
          const savedCenter = localStorage.getItem('selectedCenter');
          const savedSection = localStorage.getItem('currentSection');
          const savedEditMode = localStorage.getItem('ownerEditMode');
          
          if (savedSchool) setSelectedSchool(JSON.parse(savedSchool));
          if (savedCenter) setSelectedCenter(JSON.parse(savedCenter));
          if (savedSection) setCurrentSection(savedSection);
          if (savedEditMode && parsedUser.role_name === 'owner') {
            setOwnerEditMode(savedEditMode === 'true');
          }
          
          // Validate token in background (non-blocking)
          api.get('/auth/validate')
            .catch((error) => {
              // Token is invalid, log out
              if (error.response?.status === 401) {
                console.log('Token expired, logging out');
                logout();
                window.location.href = '/login';
              }
            });
          
          // Load available schools/centers based on role
          await loadAvailableEntities(parsedUser);
          setLoading(false);
        } catch (error) {
          // If there's an error parsing or loading, clear everything
          console.error('Error initializing auth:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('selectedSchool');
          localStorage.removeItem('selectedCenter');
          localStorage.removeItem('currentSection');
          localStorage.removeItem('ownerEditMode');
          setUser(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
        setLoadingEntities(false);
      }
    };
    
    initAuth();
  }, []);

  const loadAvailableEntities = async (userData) => {
    setLoadingEntities(true);
    try {
      // Set a timeout for the entire loading process
      const loadingTimeout = setTimeout(() => {
        console.warn('Loading entities is taking too long, using cached data if available');
        setLoadingEntities(false);
      }, 10000); // 10 second timeout

      // Trainers and Registrars get their assigned schools/centers from trainer_assignments table
      if (userData.role_name === 'trainer' || userData.role_name === 'registrar') {
        try {
          const [schoolsRes, centersRes] = await Promise.race([
            Promise.all([
              api.get('/staff-assignments/my-schools').catch(() => ({ data: [] })),
              api.get('/staff-assignments/my-centers').catch(() => ({ data: [] }))
            ]),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
          ]).catch(() => [{ data: [] }, { data: [] }]);
          
          clearTimeout(loadingTimeout);
          
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
        } catch (error) {
          clearTimeout(loadingTimeout);
          console.error('Error loading trainer/registrar assignments:', error);
          setAvailableSchools([]);
          setAvailableCenters([]);
        }
      } else if (userData.role_name === 'school_teacher') {
        // School teachers get their assigned schools from user_assignments/teacher-assignments
        try {
          const schoolsRes = await Promise.race([
            api.get('/teacher-assignments/my-schools').catch(() => ({ data: [] })),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
          ]).catch(() => ({ data: [] }));
          
          clearTimeout(loadingTimeout);
          
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
        } catch (error) {
          clearTimeout(loadingTimeout);
          console.error('Error loading teacher schools:', error);
          setAvailableSchools([]);
          setAvailableCenters([]);
        }
      } else if (userData.role_name && userData.role_name.includes('principal')) {
        // Principals get their assigned schools from user_assignments
        try {
          const schoolsRes = await Promise.race([
            api.get('/teacher-assignments/my-schools').catch(() => ({ data: [] })),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
          ]).catch(() => ({ data: [] }));
          
          clearTimeout(loadingTimeout);
          
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
        } catch (error) {
          clearTimeout(loadingTimeout);
          console.error('Error loading principal schools:', error);
          setAvailableSchools([]);
          setAvailableCenters([]);
        }
      } else if (['developer', 'owner', 'super_admin'].includes(userData.role_name)) {
        // Developer, owner, and super_admin get ALL schools and centers
        try {
          const [schoolsRes, centersRes] = await Promise.race([
            Promise.all([
              api.get('/schools').catch(() => ({ data: [] })),
              api.get('/centers').catch(() => ({ data: [] }))
            ]),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
          ]).catch(() => [{ data: [] }, { data: [] }]);
          
          clearTimeout(loadingTimeout);
          
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
        } catch (error) {
          clearTimeout(loadingTimeout);
          console.error('Error loading admin schools/centers:', error);
          setAvailableSchools([]);
          setAvailableCenters([]);
        }
      } else if (userData.role_name === 'trainer_head') {
        // Trainer_head gets schools/centers based on their section_type
        try {
          let schools = [];
          let centers = [];
          
          const promises = [];
          
          if (userData.section_type === 'school' || userData.section_type === 'both') {
            promises.push(api.get('/schools').catch(() => ({ data: [] })));
          }
          
          if (userData.section_type === 'center' || userData.section_type === 'both') {
            promises.push(api.get('/centers').catch(() => ({ data: [] })));
          }
          
          const results = await Promise.race([
            Promise.all(promises),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
          ]).catch(() => []);
          
          clearTimeout(loadingTimeout);
          
          if (userData.section_type === 'school' || userData.section_type === 'both') {
            schools = Array.isArray(results[0]?.data) ? results[0].data : [];
          }
          
          if (userData.section_type === 'center' || userData.section_type === 'both') {
            const centerIndex = (userData.section_type === 'both') ? 1 : 0;
            centers = Array.isArray(results[centerIndex]?.data) ? results[centerIndex].data : [];
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
        } catch (error) {
          clearTimeout(loadingTimeout);
          console.error('Error loading trainer_head schools/centers:', error);
          setAvailableSchools([]);
          setAvailableCenters([]);
        }
      } else {
        clearTimeout(loadingTimeout);
        // Other roles get from their user_assignments
        try {
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
        } catch (error) {
          console.error('Error loading user assignments:', error);
          setAvailableSchools([]);
          setAvailableCenters([]);
        }
      }
    } catch (err) {
      console.error('Failed to load available entities:', err);
      // Set empty arrays to prevent blank page
      setAvailableSchools([]);
      setAvailableCenters([]);
    } finally {
      setLoadingEntities(false);
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
    localStorage.removeItem('ownerEditMode');
    setUser(null);
    setSelectedSchool(null);
    setSelectedCenter(null);
    setAvailableSchools([]);
    setAvailableCenters([]);
    setOwnerEditMode(false);
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

  const toggleOwnerEditMode = () => {
    const newMode = !ownerEditMode;
    setOwnerEditMode(newMode);
    localStorage.setItem('ownerEditMode', newMode.toString());
  };

  // Check if user can edit (for owner role, depends on edit mode)
  const canEdit = () => {
    if (!user) return false;
    // Owner can always edit (removed edit mode requirement)
    return true;
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
    
    // For other roles (developer, owner, super_admin), use section_type
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
    return ['developer', 'owner', 'super_admin', 'trainer', 'trainer_head', 'registrar'].includes(user.role_name);
  };

  const canAddExtraStudents = () => {
    if (!user) return false;
    return ['developer', 'trainer', 'trainer_head'].includes(user.role_name);
  };

  const canAssignTrainers = () => {
    if (!user) return false;
    return ['developer', 'owner', 'super_admin', 'trainer_head'].includes(user.role_name);
  };

  const value = {
    user,
    loading,
    loadingEntities,
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
    isAuthenticated: !!user,
    ownerEditMode,
    toggleOwnerEditMode,
    canEdit
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
