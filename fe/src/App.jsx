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
import HocVienKhamPhaPage from './pages/HocVienKhamPhaPage';
import GuestClassRegistrationPage from './pages/GuestClassRegistrationPage'; // Import trang Đăng ký dạng Header độc lập
import ClassRegistrationPage from './pages/ClassRegistrationPage';
import ReceptionistDashboardPage from './pages/receptionist/ReceptionistDashboardPage';
import ManagementDashboard from './pages/management/ManagementDashboard';
import UserAccountListPage from './pages/management/UserAccountListPage';
import CreateStaffAccountPage from './pages/management/CreateStaffAccountPage';
import UserAccountPage from './pages/management/UserAccountPage';
import PackageListPage from './pages/management/PackageListPage';
import PackageEditorPage from './pages/management/PackageEditorPage';
import RequireAuth from './components/RequireAuth';
import { AccountManagementProvider } from './context/AccountManagementContext';
import { AuthProvider } from './context/AuthContext';
import ClassListPage from './pages/management/ClassListPage';
import RoomListPage from './pages/management/RoomListPage';
import SportCatalogPage from './pages/management/SportCatalogPage';
import ClassSchedulePage from './pages/management/ClassSchedulePage';
import CreateClassPage from './pages/management/CreateClassPage';
import AiWorkoutPage from './pages/AiWorkoutPage';
import RevenuePage from './pages/management/RevenuePage';
import EnrollmentConsultationsPage from './pages/management/EnrollmentConsultationsPage';
import CenterCheckInPage from './pages/management/CenterCheckInPage';
import PrivateRequestsPage from './pages/management/PrivateRequestsPage';
import CoachCoursePage from './pages/CoachCoursePage';
import MemberCoursePlanPage from './pages/MemberCoursePlanPage';
import MemberCourseMaterialPage from './pages/MemberCourseMaterialPage';
import CourseMaterialPage from './pages/management/CourseMaterialPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import StudentLayout from './components/workspace/StudentLayout';

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

            {/* Route Đăng nhập & Đăng ký */}
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />

            {/* Route Hồ sơ cá nhân */}
            <Route path="/ho-so" element={<Protected><ProfilePage /></Protected>} />

            {/* CÁC ROUTE KHÁM PHẢ ĐỘC LẬP (KHÔNG DÍNH STUDENTLAYOUT / SIDEBAR ĐEN) */}
            <Route
              path="/hoc-vien-kham-pha"
              element={
                <Protected allowedRoles={['MEMBER', 'ADMIN']}>
                  <HocVienKhamPhaPage />
                </Protected>
              }
            />
            <Route
              path="/dang-ky-khoa-hoc-kham-pha"
              element={
                <Protected allowedRoles={['MEMBER', 'ADMIN']}>
                  <GuestClassRegistrationPage />
                </Protected>
              }
            />
            <Route
              path="/dang-ky-thanh-vien-kham-pha"
              element={
                <Protected allowedRoles={['MEMBER', 'ADMIN']}>
                  <GuestClassRegistrationPage membershipOnly />
                </Protected>
              }
            />

            {/* KHUNG CHUNG CHO MỌI TRANG HỌC VIÊN ĐÃ ACTIVE GÓI (CÓ SIDEBAR ĐEN) */}
            <Route element={<Protected allowedRoles={['MEMBER', 'ADMIN']}><StudentLayout /></Protected>}>
              <Route path="/hoc-vien-dashboard" element={<HocVienDashboardPage />} />
              <Route path="/dang-ky-khoa-hoc" element={<ClassRegistrationPage />} />
              <Route path="/dang-ky-thanh-vien" element={<ClassRegistrationPage membershipOnly />} />
              <Route path="/hoc-vien/lich-su-thanh-toan" element={<PaymentHistoryPage />} />
              <Route
                path="/hoc-vien/bai-tap-lop"
                element={<Protected allowedRoles={['MEMBER']}><MemberCoursePlanPage /></Protected>}
              />
              <Route
                path="/hoc-vien/giao-trinh"
                element={<Protected allowedRoles={['MEMBER']}><MemberCourseMaterialPage /></Protected>}
              />
              <Route
                path="/hoc-vien/giao-an-ai"
                element={<Protected allowedRoles={['MEMBER']}><AiWorkoutPage /></Protected>}
              />
              <Route
                path="/hoc-vien/lo-trinh-tap"
                element={<Protected allowedRoles={['MEMBER']}><AiWorkoutPage mode="routine" /></Protected>}
              />
              <Route
                path="/hoc-vien/lo-trinh-tap/dieu-chinh"
                element={<Protected allowedRoles={['MEMBER']}><AiWorkoutPage mode="adjust" /></Protected>}
              />
            </Route>

            <Route path="/hoc-vien/hoc-1-1" element={<Navigate to="/dang-ky-khoa-hoc?type=private" replace />} />

            <Route
              path="/hlv/lop-hoc"
              element={
                <Protected allowedRoles={['COACH']}>
                  <CoachCoursePage />
                </Protected>
              }
            />

            <Route path="/hlv/lich-su-tap" element={<Navigate to="/hlv/lop-hoc?tab=ai" replace />} />

            {/* Route LỄ TÂN DASHBOARD */}
            <Route 
              path="/le-tan" 
              element={
                <Protected allowedRoles={['RECEPTIONIST', 'STAFF', 'ADMIN']}>
                  <ReceptionistDashboardPage />
                </Protected>
              } 
            />

            {/* Route Quản lý (ADMIN) */}
            <Route path="/quan-ly" element={<Protected allowedRoles={['ADMIN']}><ManagementDashboard /></Protected>} />
            <Route path="/quan-ly/doanh-thu" element={<Protected allowedRoles={['ADMIN']}><RevenuePage /></Protected>} />
            <Route path="/quan-ly/tai-khoan" element={<Protected allowedRoles={['ADMIN']}><UserAccountListPage /></Protected>} />
            <Route path="/quan-ly/tai-khoan/moi" element={<Protected allowedRoles={['ADMIN']}><CreateStaffAccountPage /></Protected>} />
            <Route path="/quan-ly/tai-khoan/:userId" element={<Protected allowedRoles={['ADMIN']}><UserAccountPage /></Protected>} />
            
            <Route path="/quan-ly/goi" element={<Protected allowedRoles={['ADMIN']}><PackageListPage /></Protected>} />
            <Route path="/quan-ly/goi/moi" element={<Protected allowedRoles={['ADMIN']}><PackageEditorPage mode="create" /></Protected>} />
            <Route path="/quan-ly/goi/:packageId" element={<Protected allowedRoles={['ADMIN']}><PackageEditorPage mode="edit" /></Protected>} />
            <Route path="/quan-ly/tu-van-ghi-danh" element={<Protected allowedRoles={['ADMIN']}><EnrollmentConsultationsPage /></Protected>} />
            <Route path="/quan-ly/check-in" element={<Protected allowedRoles={['ADMIN']}><CenterCheckInPage /></Protected>} />
            <Route path="/quan-ly/yeu-cau-1-1" element={<Protected allowedRoles={['ADMIN']}><PrivateRequestsPage /></Protected>} />
            <Route path="/quan-ly/giao-trinh" element={<Protected allowedRoles={['ADMIN']}><CourseMaterialPage /></Protected>} />
            <Route path="/quan-ly/phong-tap" element={<Protected allowedRoles={['ADMIN']}><RoomListPage /></Protected>} />
            <Route path="/quan-ly/mon-hoc" element={<Protected allowedRoles={['ADMIN']}><SportCatalogPage /></Protected>} />
            <Route path="/quan-ly/lop-hoc" element={<Protected allowedRoles={['ADMIN']}><ClassListPage /></Protected>} />
            <Route path="/quan-ly/lop-hoc/moi" element={<Protected allowedRoles={['ADMIN']}><CreateClassPage /></Protected>} />
            <Route path="/quan-ly/lop-hoc/:classId/lich" element={<Protected allowedRoles={['ADMIN']}><ClassSchedulePage /></Protected>} />
            
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Router>
      </AccountManagementProvider>
    </AuthProvider>
  );
}