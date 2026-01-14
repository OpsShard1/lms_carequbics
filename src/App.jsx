import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ParentProgress from './pages/ParentProgress';
import SchoolDashboard from './pages/school/Dashboard';
import SchoolClasses from './pages/school/Classes';
import SchoolStudents from './pages/school/Students';
import SchoolTimetable from './pages/school/Timetable';
import SchoolAttendance from './pages/school/Attendance';
import CenterDashboard from './pages/center/Dashboard';
import CenterStudents from './pages/center/Students';
import CenterAttendance from './pages/center/Attendance';
import CenterProgress from './pages/center/Progress';
import AdminUsers from './pages/admin/Users';
import AdminSchools from './pages/admin/Schools';
import AdminCenters from './pages/admin/Centers';
import './App.css';

const HomeRedirect = () => {
  const { currentSection } = useAuth();
  return <Navigate to={currentSection === 'center' ? '/center/dashboard' : '/school/dashboard'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/parent/progress" element={<ParentProgress />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            {/* School Routes */}
            <Route path="school/dashboard" element={<SchoolDashboard />} />
            <Route path="school/classes" element={<SchoolClasses />} />
            <Route path="school/students" element={<SchoolStudents />} />
            <Route path="school/timetable" element={<SchoolTimetable />} />
            <Route path="school/attendance" element={<SchoolAttendance />} />
            {/* Center Routes */}
            <Route path="center/dashboard" element={<CenterDashboard />} />
            <Route path="center/students" element={<CenterStudents />} />
            <Route path="center/attendance" element={<CenterAttendance />} />
            <Route path="center/progress" element={<CenterProgress />} />
            {/* Admin Routes */}
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/schools" element={<AdminSchools />} />
            <Route path="admin/centers" element={<AdminCenters />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
