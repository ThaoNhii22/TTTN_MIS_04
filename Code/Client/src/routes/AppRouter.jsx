import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import WorkshopPage from '../pages/WorkshopPage';

function PlaceholderPage({ title }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>Màn hình này sẽ được triển khai ở task tiếp theo.</p>
    </section>
  );
}

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
              path="/waitlist"
              element={<PlaceholderPage title="Waitlist" />}
            />

            <Route
              path="/check-in"
              element={<PlaceholderPage title="QR Check-in" />}
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