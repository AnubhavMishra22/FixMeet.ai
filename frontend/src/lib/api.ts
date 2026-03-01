import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store access token in memory (not localStorage for security)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Add auth header to requests
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle 401 errors - try to refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        setAccessToken(data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Meeting Briefs
// ---------------------------------------------------------------------------
import type {
  MeetingBriefWithBooking,
  MeetingFollowupWithBooking,
  MeetingFollowup,
  DateRange,
  MeetingStats,
  MeetingsByDay,
  MeetingsByHour,
  MeetingsByType,
  MeetingTrends,
  NoShowStats,
  AIInsightsResponse,
} from '../types';

export async function getBriefs(): Promise<MeetingBriefWithBooking[]> {
  const { data } = await api.get('/api/briefs');
  return data.data;
}

export async function getBrief(bookingId: string): Promise<MeetingBriefWithBooking> {
  const { data } = await api.get(`/api/briefs/${bookingId}`);
  return data.data;
}

export async function generateBriefForBooking(bookingId: string): Promise<MeetingBriefWithBooking> {
  const { data } = await api.post(`/api/briefs/generate/${bookingId}`);
  return data.data;
}

export async function regenerateBrief(bookingId: string): Promise<MeetingBriefWithBooking> {
  const { data } = await api.post(`/api/briefs/regenerate/${bookingId}`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export async function getFollowups(): Promise<MeetingFollowupWithBooking[]> {
  const { data } = await api.get('/api/followups');
  return data.data;
}

export async function getFollowup(id: string): Promise<MeetingFollowupWithBooking> {
  const { data } = await api.get(`/api/followups/${id}`);
  return data.data;
}

export async function updateFollowup(
  id: string,
  updates: { subject?: string; body?: string; actionItems?: string[] },
): Promise<MeetingFollowup> {
  const { data } = await api.patch(`/api/followups/${id}`, updates);
  return data.data;
}

export async function sendFollowup(id: string): Promise<MeetingFollowup> {
  const { data } = await api.post(`/api/followups/${id}/send`);
  return data.data;
}

export async function skipFollowup(id: string): Promise<MeetingFollowup> {
  const { data } = await api.post(`/api/followups/${id}/skip`);
  return data.data;
}

export async function generateFollowupForBooking(
  bookingId: string,
  meetingNotes?: string,
): Promise<MeetingFollowupWithBooking> {
  const { data } = await api.post(`/api/followups/generate/${bookingId}`, { meetingNotes });
  return data.data;
}

export async function getFollowupByBookingId(
  bookingId: string,
): Promise<MeetingFollowupWithBooking | null> {
  const { data } = await api.get(`/api/followups/by-booking/${bookingId}`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export async function getInsightsStats(range: DateRange): Promise<MeetingStats> {
  const { data } = await api.get('/api/insights/stats', { params: { range } });
  return data.data;
}

export async function getInsightsByDay(range: DateRange): Promise<MeetingsByDay> {
  const { data } = await api.get('/api/insights/by-day', { params: { range } });
  return data.data;
}

export async function getInsightsByHour(range: DateRange): Promise<MeetingsByHour> {
  const { data } = await api.get('/api/insights/by-hour', { params: { range } });
  return data.data;
}

export async function getInsightsByType(range: DateRange): Promise<MeetingsByType> {
  const { data } = await api.get('/api/insights/by-type', { params: { range } });
  return data.data;
}

export async function getInsightsTrends(): Promise<MeetingTrends> {
  const { data } = await api.get('/api/insights/trends');
  return data.data;
}

export async function getInsightsNoShows(range: DateRange): Promise<NoShowStats> {
  const { data } = await api.get('/api/insights/no-shows', { params: { range } });
  return data.data;
}

export async function getAIInsights(): Promise<AIInsightsResponse> {
  const { data } = await api.get('/api/insights/ai');
  return data.data;
}

export default api;
