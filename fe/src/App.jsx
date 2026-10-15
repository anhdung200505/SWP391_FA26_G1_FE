import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage';
import FacilitiesPage from './pages/FacilitiesPage';
import CoachPage from './pages/CoachPage';
import CoursesPage from './pages/CoursesPage';
import ManagementDashboard from './pages/management/ManagementDashboard';
import UserAccountListPage from './pages/management/UserAccountListPage';
import UserAccountPage from './pages/management/UserAccountPage';
import PackageListPage from './pages/management/PackageListPage';
import PackageEditorPage from './pages/management/PackageEditorPage';
import { AccountManagementProvider } from './context/AccountManagementContext';

export default function App() {
  return (
    <AccountManagementProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/co-so-vat-chat" element={<FacilitiesPage />} />
          <Route path="/hlv" element={<CoachPage />} />
          <Route path="/khoa-hoc" element={<CoursesPage />} />
          <Route path="/quan-ly" element={<ManagementDashboard />} />
          <Route path="/quan-ly/tai-khoan" element={<UserAccountListPage />} />
          <Route path="/quan-ly/tai-khoan/:userId" element={<UserAccountPage />} />
          <Route path="/quan-ly/goi" element={<PackageListPage />} />
          <Route path="/quan-ly/goi/moi" element={<PackageEditorPage mode="create" />} />
          <Route path="/quan-ly/goi/:packageId" element={<PackageEditorPage mode="edit" />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </AccountManagementProvider>
  );
}