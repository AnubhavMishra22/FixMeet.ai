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
import type { MeetingBriefWithBooking, MeetingFollowupWithBooking, MeetingFollowup } from '../types';

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

export default api;
