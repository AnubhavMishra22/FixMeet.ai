import type { User } from '../types';

/** Session flag: full dashboard UI without API (dev only). */
export const DEV_DASHBOARD_PREVIEW_SESSION = 'fixmeet-dev-dashboard-preview';

export const DEV_MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'preview@local.dev',
  name: 'Preview User',
  username: 'preview',
  timezone: 'UTC',
  briefsEnabled: false,
  briefEmailsEnabled: false,
  briefGenerationHours: 24,
  followupsEnabled: false,
  followupTone: 'friendly',
  meetingHoursGoal: null,
  billingPlan: 'free',
  subscriptionStatus: null,
  subscriptionCurrentPeriodEnd: null,
  billingShowcaseMode: true,
  hasStripeCustomer: false,
  billingStripeConfigured: false,
  createdAt: new Date().toISOString(),
};

export function isDevDashboardPreviewSession(): boolean {
  if (!import.meta.env.DEV || typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(DEV_DASHBOARD_PREVIEW_SESSION) === '1';
}

export function clearDevDashboardPreviewSession(): void {
  try {
    sessionStorage.removeItem(DEV_DASHBOARD_PREVIEW_SESSION);
  } catch {
    /* ignore */
  }
}
