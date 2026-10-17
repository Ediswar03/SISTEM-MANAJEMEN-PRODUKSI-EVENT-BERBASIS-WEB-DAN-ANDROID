/**
 * EPMS Crew Mobile — Typed API client
 * Uses AsyncStorage for token persistence (React Native).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE =
  (process.env['EXPO_PUBLIC_API_URL'] ?? 'http://10.0.2.2:4000/api/v1').replace(/\/$/, '');

// ─── Token helpers ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'epms_access_token';
const REFRESH_KEY = 'epms_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { await clearTokens(); return null; }
    const json = (await res.json()) as { data: { accessToken: string; refreshToken: string } };
    await setTokens(json.data.accessToken, json.data.refreshToken);
    return json.data.accessToken;
  } catch {
    await clearTokens();
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken) => {
          if (newToken) resolve(request<T>(path, options, false));
          else reject(new ApiError(401, 'UNAUTHENTICATED', 'Session expired.'));
        });
      });
    }
    isRefreshing = true;
    const newToken = await tryRefresh();
    isRefreshing = false;
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];
    if (!newToken) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again.');
    return request<T>(path, options, false);
  }

  if (res.status === 204) return undefined as unknown as T;

  let body: unknown;
  try { body = await res.json(); } catch { body = null; }

  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string; details: unknown } })?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN_ERROR', err?.message ?? `HTTP ${res.status}`, err?.details);
  }

  return body as T;
}

// ─── Typed API methods ────────────────────────────────────────────────────────

export const api = {
  login: (email: string, password: string) =>
    request<{ data: { accessToken: string; refreshToken: string; user: UserInfo } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  logout: async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try { await request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }); }
      catch { /* ignore */ }
    }
    await clearTokens();
  },

  getMe: () => request<{ data: UserInfo }>('/auth/me'),

  getMySchedule: () => request<{ data: AssignmentInfo[] }>('/users/me/schedule'),

  getEvent: (id: string) => request<{ data: EventDetail }>(`/events/${id}`),

  updateAssignment: (eventId: string, assignmentId: string, body: { jobStatus?: string; notes?: string }) =>
    request<{ data: AssignmentInfo }>(`/events/${eventId}/assignments/${assignmentId}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'CREW';
  isActive: boolean;
  crewProfile?: { id: string; phone: string | null; skills: string; isActive: boolean } | null;
}

export interface EventInfo {
  id: string;
  code: string;
  name: string;
  clientName: string | null;
  location: string;
  timezone: string;
  startAt: string;
  endAt: string;
  status: string;
}

export interface EventDetail extends EventInfo {
  notes: string | null;
  assignments: AssignmentInfo[];
  allocations: AllocationInfo[];
}

export interface AssignmentInfo {
  id: string;
  eventId: string;
  roleInEvent: string;
  jobStatus: string;
  status: string;
  startAt: string;
  endAt: string;
  notes: string | null;
  crewProfile?: { id: string; user: { id: string; fullName: string; email: string } };
  event?: {
    id: string;
    code: string;
    name: string;
    location: string;
    startAt: string;
    endAt: string;
    status: string;
  };
}

export interface AllocationInfo {
  id: string;
  equipmentId: string;
  quantity: number;
  status: string;
  equipment?: { id: string; code: string; name: string };
}
