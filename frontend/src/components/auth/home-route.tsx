import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import LandingPage from '../../pages/landing';

/**
 * Renders the public landing page at "/" for unauthenticated visitors and
 * forwards authenticated users straight to the dashboard.
 *
 * The auth store is initialized with `isLoading: true`; we trigger
 * `fetchUser` once so a page refresh on "/" doesn't briefly flash the
 * landing UI for a signed-in user before redirecting.
 */
export function HomeRoute() {
  const { isLoading, isAuthenticated, fetchUser } = useAuthStore();
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
