import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import WorkshopPage from '../pages/WorkshopPage';
import WorkshopDetailPage from '../pages/WorkshopDetailPage';
import WaitlistPage from '../pages/WaitlistPage';
import CheckInPage from '../pages/CheckInPage';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />

            <Route
              path="/workshops"
              element={<WorkshopPage />}
            />

            <Route
              path="/workshops/:id"
              element={<WorkshopDetailPage />}
            />

            <Route
              path="/waitlist"
              element={<WaitlistPage />}
            />

            <Route
              path="/check-in"
              element={<CheckInPage />}
            />
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