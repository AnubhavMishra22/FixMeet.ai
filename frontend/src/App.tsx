import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { ProtectedRoute } from './components/auth/protected-route';
import { DashboardLayout } from './components/layout/dashboard-layout';
import { Toaster } from './components/ui/toaster';

// Auth pages
import LoginPage from './pages/auth/login';
import RegisterPage from './pages/auth/register';

// Dashboard pages
import DashboardPage from './pages/dashboard/index';
import EventTypesPage from './pages/dashboard/event-types/index';
import NewEventTypePage from './pages/dashboard/event-types/new';
import EditEventTypePage from './pages/dashboard/event-types/edit';
import BookingsPage from './pages/dashboard/bookings/index';
import BookingDetailsPage from './pages/dashboard/bookings/details';
import SettingsPage from './pages/dashboard/settings/index';
import AIChatPage from './pages/dashboard/ai/index';
import BriefsPage from './pages/dashboard/briefs/index';
import BriefDetailsPage from './pages/dashboard/briefs/details';
import FollowupsPage from './pages/dashboard/followups/index';
import FollowupDetailsPage from './pages/dashboard/followups/details';
import InsightsPage from './pages/dashboard/insights/index';

// Public pages
import PublicBookingPage from './pages/booking/public-booking';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/event-types"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EventTypesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/event-types/new"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <NewEventTypePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/event-types/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EditEventTypePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/bookings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BookingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/bookings/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BookingDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/ai"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AIChatPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/briefs"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BriefsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/briefs/:bookingId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BriefDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/followups"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <FollowupsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/followups/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <FollowupDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/insights"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <InsightsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Public booking page */}
        <Route path="/:username/:slug" element={<PublicBookingPage />} />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/settings/calendars" element={<Navigate to="/dashboard/settings" replace />} />
      </Routes>

      <Toaster />
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
