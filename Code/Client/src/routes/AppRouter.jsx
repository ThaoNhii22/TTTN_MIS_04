import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import WorkshopPage from '../pages/WorkshopPage';
import WorkshopDetailPage from '../pages/WorkshopDetailPage';
import MyTicketsPage from '../pages/MyTicketsPage';
import WaitlistPage from '../pages/WaitlistPage';
import CheckInPage from '../pages/CheckInPage';
import OrganizerWorkshopsPage from '../pages/OrganizerWorkshopsPage';
import AdminReviewPage from '../pages/AdminReviewPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import DashboardPage from '../pages/DashboardPage';
import AuditLogsPage from '../pages/AuditLogsPage';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          {/* All Authenticated Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/workshops" element={<WorkshopPage />} />
            <Route path="/workshops/:id" element={<WorkshopDetailPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/check-in" element={<CheckInPage />} />
          </Route>

          {/* Organizer & Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['organizer', 'admin']} />}>
            <Route path="/organizer/workshops" element={<OrganizerWorkshopsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/reviews" element={<AdminReviewPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;