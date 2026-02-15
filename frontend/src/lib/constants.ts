export const APP_NAME = 'FixMeet';

export const LOGO_PATH = '/favicon.ico';

export const BOOKING_STATUS = {
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  rescheduled: { label: 'Rescheduled', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  no_show: { label: 'No Show', color: 'bg-orange-100 text-orange-800' },
} as const;

export const LOCATION_TYPES = {
  google_meet: { label: 'Google Meet', icon: 'video' },
  zoom: { label: 'Zoom', icon: 'video' },
  teams: { label: 'Microsoft Teams', icon: 'video' },
  phone: { label: 'Phone Call', icon: 'phone' },
  in_person: { label: 'In Person', icon: 'map-pin' },
  custom: { label: 'Custom', icon: 'link' },
} as const;

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
