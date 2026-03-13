import { useEffect } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import DashboardPage from '../dashboard/index';
import { DEV_MOCK_USER } from '../../lib/dev-mock-user';

/**
 * Dev-only: full dashboard shell + home page with a mock user (no login / backend required).
 * Open when running `npm run dev`: http://localhost:5173/dev/preview-dashboard
 * Not included in production builds.
 */
export default function DevDashboardPreview() {
  useEffect(() => {
    useAuthStore.setState({
      user: DEV_MOCK_USER,
      isAuthenticated: true,
      isLoading: false,
    });
    return () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950/90">
        <strong>Dev preview</strong> — not logged in for real. API data may fail; use this to check layout
        and sidebar. Production builds do not include this route.
      </div>
      <DashboardPage />
    </DashboardLayout>
  );
}
