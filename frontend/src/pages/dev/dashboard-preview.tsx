import { useLayoutEffect } from 'react';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import DashboardPage from '../dashboard/index';
import {
  DEV_DASHBOARD_PREVIEW_SESSION,
  DEV_MOCK_USER,
} from '../../lib/dev-dashboard-preview';
import { useAuthStore } from '../../stores/auth-store';

/**
 * Full dashboard home (same components as production) without backend.
 * Dev only — see App.tsx route `/dev/dashboard-preview`.
 */
export default function DevDashboardPreviewPage() {
  const setAuth = useAuthStore.setState;

  useLayoutEffect(() => {
    try {
      sessionStorage.setItem(DEV_DASHBOARD_PREVIEW_SESSION, '1');
    } catch {
      /* ignore */
    }
    setAuth({
      user: DEV_MOCK_USER,
      isAuthenticated: true,
      isLoading: false,
    });
  }, [setAuth]);

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong className="font-semibold">Local preview</strong> — same dashboard UI as production;
        API calls are skipped or return empty data without the backend. Log in normally when the
        server is running.
      </div>
      <DashboardPage />
    </DashboardLayout>
  );
}
