import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage';
import FacilitiesPage from './pages/FacilitiesPage';
import CoachPage from './pages/CoachPage';
import CoursesPage from './pages/CoursesPage';
import LoginPage from './pages/LoginPage';
import ManagementDashboard from './pages/management/ManagementDashboard';
import UserAccountListPage from './pages/management/UserAccountListPage';
import UserAccountPage from './pages/management/UserAccountPage';
import PackageListPage from './pages/management/PackageListPage';
import PackageEditorPage from './pages/management/PackageEditorPage';
import PaymentPage from './pages/PaymentPage';
import PaymentResultPage from './pages/PaymentResultPage';
import RequireAuth from './components/RequireAuth';
import { AccountManagementProvider } from './context/AccountManagementContext';
import { AuthProvider } from './context/AuthContext';

function Protected({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
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
            <Route path="/thanh-toan" element={<PaymentPage />} />
            <Route path="/dang-ky" element={<PaymentPage />} />
            <Route path="/payment/result" element={<PaymentResultPage />} />
            <Route path="/payment/cancel" element={<PaymentResultPage />} />
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/quan-ly" element={<Protected><ManagementDashboard /></Protected>} />
            <Route path="/quan-ly/tai-khoan" element={<Protected><UserAccountListPage /></Protected>} />
            <Route path="/quan-ly/tai-khoan/:userId" element={<Protected><UserAccountPage /></Protected>} />
            <Route path="/quan-ly/goi" element={<Protected><PackageListPage /></Protected>} />
            <Route path="/quan-ly/goi/moi" element={<Protected><PackageEditorPage mode="create" /></Protected>} />
            <Route path="/quan-ly/goi/:packageId" element={<Protected><PackageEditorPage mode="edit" /></Protected>} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Router>
      </AccountManagementProvider>
    </AuthProvider>
  );
}