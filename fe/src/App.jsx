import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage';
import FacilitiesPage from './pages/FacilitiesPage';
import CoachPage from './pages/CoachPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import AdmissionsPage from './pages/AdmissionsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import HocVienDashboardPage from './pages/HocVienDashboardPage';
import ClassRegistrationPage from './pages/ClassRegistrationPage';
import ReceptionistDashboardPage from './pages/receptionist/ReceptionistDashboardPage'; // Import trang Lễ tân
import ManagementDashboard from './pages/management/ManagementDashboard';
import UserAccountListPage from './pages/management/UserAccountListPage';
import UserAccountPage from './pages/management/UserAccountPage';
import PackageListPage from './pages/management/PackageListPage';
import PackageEditorPage from './pages/management/PackageEditorPage';
import RequireAuth from './components/RequireAuth';
import { AccountManagementProvider } from './context/AccountManagementContext';
import { AuthProvider } from './context/AuthContext';
import ClassListPage from './pages/management/ClassListPage';
import SessionSchedulePage from './pages/management/SessionSchedulePage';
import CreateClassPage from './pages/management/CreateClassPage';

function Protected({ children, allowedRoles }) {
  return <RequireAuth allowedRoles={allowedRoles}>{children}</RequireAuth>;
}

export default function App() {
  return (
    <AuthProvider>
      <AccountManagementProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/co-so-vat-chat" element={<FacilitiesPage />} />
            <Route path="/hlv" element={<CoachPage />} />
            <Route path="/khoa-hoc" element={<CoursesPage />} />
            <Route path="/khoa-hoc/:courseSlug" element={<CourseDetailPage />} />

            {/* Route Tuyển sinh */}
            <Route path="/tuyen-sinh" element={<AdmissionsPage />} />

            {/* Khai báo route Đăng nhập & Đăng ký */}
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />

            {/* Route Hồ sơ cá nhân */}
            <Route path="/ho-so" element={<Protected><ProfilePage /></Protected>} />

            {/* Route Dashboard Học viên */}
            <Route 
              path="/hoc-vien-dashboard" 
              element={
                <Protected allowedRoles={['MEMBER', 'ADMIN']}>
                  <HocVienDashboardPage />
                </Protected>
              } 
            />

            {/* Route Xác nhận Đăng ký Khóa học */}
            <Route 
              path="/dang-ky-khoa-hoc" 
              element={
                <Protected allowedRoles={['MEMBER', 'ADMIN']}>
                  <ClassRegistrationPage />
                </Protected>
              } 
            />

            {/* Route LỄ TÂN DASHBOARD (Không chứa Header/Footer chung) */}
            <Route 
              path="/le-tan" 
              element={
                <Protected allowedRoles={['RECEPTIONIST', 'STAFF', 'ADMIN']}>
                  <ReceptionistDashboardPage />
                </Protected>
              } 
            />

            {/* Khai báo các route Quản lý (ADMIN) */}
            <Route path="/quan-ly" element={<Protected allowedRoles={['ADMIN']}><ManagementDashboard /></Protected>} />
            <Route path="/quan-ly/tai-khoan" element={<Protected allowedRoles={['ADMIN']}><UserAccountListPage /></Protected>} />
            
            {/* Route chi tiết tài khoản */}
            <Route path="/quan-ly/tai-khoan/:userId" element={<Protected allowedRoles={['ADMIN']}><UserAccountPage /></Protected>} />
            
            <Route path="/quan-ly/goi" element={<Protected allowedRoles={['ADMIN']}><PackageListPage /></Protected>} />
            <Route path="/quan-ly/goi/moi" element={<Protected allowedRoles={['ADMIN']}><PackageEditorPage mode="create" /></Protected>} />
            <Route path="/quan-ly/goi/:packageId" element={<Protected allowedRoles={['ADMIN']}><PackageEditorPage mode="edit" /></Protected>} />
            <Route path="/quan-ly/lop-hoc" element={<Protected allowedRoles={['ADMIN']}><ClassListPage /></Protected>} />
            <Route path="/quan-ly/lop-hoc/moi" element={<Protected allowedRoles={['ADMIN']}><CreateClassPage /></Protected>} />
            <Route path="/quan-ly/lich-hoc" element={<Protected allowedRoles={['ADMIN']}><SessionSchedulePage /></Protected>} />
            
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Router>
      </AccountManagementProvider>
    </AuthProvider>
  );
}