import type { User } from '../types';

/** Used only by the dev dashboard preview route (no backend / login). */
export const DEV_MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'preview@localhost',
  name: 'Preview User',
  username: 'preview',
  timezone: 'UTC',
  briefsEnabled: false,
  briefEmailsEnabled: false,
  briefGenerationHours: 24,
  followupsEnabled: false,
  followupTone: 'friendly',
  meetingHoursGoal: null,
  createdAt: new Date().toISOString(),
};
