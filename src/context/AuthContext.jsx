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
  const [currentSection, setCurrentSection] = useState('school'); // 'school' or 'center'

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Restore selections
      const savedSchool = localStorage.getItem('selectedSchool');
      const savedCenter = localStorage.getItem('selectedCenter');
      const savedSection = localStorage.getItem('currentSection');
      
      if (savedSchool) setSelectedSchool(JSON.parse(savedSchool));
      if (savedCenter) setSelectedCenter(JSON.parse(savedCenter));
      if (savedSection) setCurrentSection(savedSection);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    // Auto-select if user has only one assignment
    const schoolAssignments = userData.assignments?.filter(a => a.school_id) || [];
    const centerAssignments = userData.assignments?.filter(a => a.center_id) || [];

    if (schoolAssignments.length === 1) {
      const school = { id: schoolAssignments[0].school_id, name: schoolAssignments[0].school_name };
      setSelectedSchool(school);
      localStorage.setItem('selectedSchool', JSON.stringify(school));
    }
    if (centerAssignments.length === 1) {
      const center = { id: centerAssignments[0].center_id, name: centerAssignments[0].center_name };
      setSelectedCenter(center);
      localStorage.setItem('selectedCenter', JSON.stringify(center));
    }

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

  const canAccessSection = (section) => {
    if (!user) return false;
    return user.section_type === 'both' || user.section_type === section;
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
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
