/**
 * Typed API client for EPMS Admin Web.
 * Handles auth headers, token refresh on 401, and error normalization.
 */

const API_BASE =
  (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('epms_access_token');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('epms_access_token', accessToken);
  localStorage.setItem('epms_refresh_token', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('epms_access_token');
  localStorage.removeItem('epms_refresh_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('epms_refresh_token');
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

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

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const json = (await res.json()) as { data: { accessToken: string; refreshToken: string } };
    setTokens(json.data.accessToken, json.data.refreshToken);
    return json.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    // Queue concurrent 401s
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken) => {
          if (newToken) {
            resolve(request<T>(path, options, false));
          } else {
            reject(new ApiError(401, 'UNAUTHENTICATED', 'Session expired.'));
          }
        });
      });
    }

    isRefreshing = true;
    const newToken = await tryRefresh();
    isRefreshing = false;
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];

    if (!newToken) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again.');
    }

    return request<T>(path, options, false);
  }

  if (res.status === 204) return undefined as unknown as T;

  let body: unknown;
  try { body = await res.json(); } catch { body = null; }

  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string; details: unknown } })?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? `HTTP ${res.status}`,
      err?.details,
    );
  }

  return body as T;
}

// ─── Typed API methods ────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ data: { accessToken: string; refreshToken: string; user: UserInfo } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  logout: (refreshToken: string) =>
    request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  getMe: () => request<{ data: UserInfo }>('/auth/me'),

  // Users
  getUsers: (params?: Record<string, string>) =>
    request<ListResponse<UserInfo>>(`/users${toQS(params)}`),

  getUser: (id: string) => request<{ data: UserInfo }>(`/users/${id}`),

  createUser: (body: CreateUserBody) =>
    request<{ data: UserInfo }>('/users', { method: 'POST', body: JSON.stringify(body) }),

  updateUser: (id: string, body: Partial<UpdateUserBody>) =>
    request<{ data: UserInfo }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getMySchedule: () => request<{ data: AssignmentInfo[] }>('/users/me/schedule'),

  // Events
  getEvents: (params?: Record<string, string>) =>
    request<ListResponse<EventInfo>>(`/events${toQS(params)}`),

  getEvent: (id: string) => request<{ data: EventDetail }>(`/events/${id}`),

  createEvent: (body: CreateEventBody) =>
    request<{ data: EventInfo }>('/events', { method: 'POST', body: JSON.stringify(body) }),

  updateEvent: (id: string, body: Partial<CreateEventBody>) =>
    request<{ data: EventInfo }>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  transitionEventStatus: (id: string, toStatus: string, reason?: string) =>
    request<{ data: EventInfo }>(`/events/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ toStatus, reason }),
    }),

  // Equipment
  getCategories: () => request<{ data: CategoryInfo[] }>('/equipment/categories'),

  getEquipment: (params?: Record<string, string>) =>
    request<ListResponse<EquipmentInfo>>(`/equipment${toQS(params)}`),

  getEquipmentItem: (id: string) => request<{ data: EquipmentDetail }>(`/equipment/${id}`),

  createEquipment: (body: CreateEquipmentBody) =>
    request<{ data: EquipmentInfo }>('/equipment', { method: 'POST', body: JSON.stringify(body) }),

  updateEquipment: (id: string, body: UpdateEquipmentBody) =>
    request<{ data: EquipmentInfo }>(`/equipment/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getEquipmentAvailability: (id: string, startAt: string, endAt: string) =>
    request<{ data: AvailabilityInfo }>(`/equipment/${id}/availability?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`),

  // Allocations
  getEventAllocations: (eventId: string) =>
    request<{ data: AllocationInfo[] }>(`/events/${eventId}/allocations`),

  createAllocation: (eventId: string, body: CreateAllocationBody) =>
    request<{ data: AllocationInfo }>(`/events/${eventId}/allocations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  cancelAllocation: (eventId: string, allocationId: string) =>
    request<{ data: AllocationInfo }>(`/events/${eventId}/allocations/${allocationId}`, {
      method: 'DELETE',
    }),

  // Assignments
  getEventAssignments: (eventId: string) =>
    request<{ data: AssignmentInfo[] }>(`/events/${eventId}/assignments`),

  createAssignment: (eventId: string, body: CreateAssignmentBody) =>
    request<{ data: AssignmentInfo }>(`/events/${eventId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateAssignment: (eventId: string, assignmentId: string, body: { jobStatus?: string; notes?: string }) =>
    request<{ data: AssignmentInfo }>(`/events/${eventId}/assignments/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  cancelAssignment: (eventId: string, assignmentId: string) =>
    request<{ data: AssignmentInfo }>(`/events/${eventId}/assignments/${assignmentId}`, {
      method: 'DELETE',
    }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'CREW';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  crewProfile?: {
    id: string;
    phone: string | null;
    skills: string;
    notes: string | null;
    isActive: boolean;
  } | null;
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
  notes: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdBy: { id: string; fullName: string; email: string };
  responsibleUser: { id: string; fullName: string; email: string } | null;
  _count?: { allocations: number; assignments: number };
}

export interface EventDetail extends EventInfo {
  allocations: AllocationInfo[];
  assignments: AssignmentInfo[];
  statusHistory: StatusHistoryItem[];
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: { id: string; fullName: string };
  reason: string | null;
  createdAt: string;
}

export interface CategoryInfo {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface EquipmentInfo {
  id: string;
  code: string;
  name: string;
  usableQuantity: number;
  quantityOnHand: number;
  condition: string;
  storageLocation: string;
  isActive: boolean;
  category: { id: string; code: string; name: string };
}

export interface EquipmentDetail extends EquipmentInfo {
  description: string | null;
  notes: string | null;
  allocations: AllocationInfo[];
}

export interface AllocationInfo {
  id: string;
  eventId: string;
  equipmentId: string;
  quantity: number;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED';
  startAt: string;
  endAt: string;
  notes: string | null;
  equipment?: { id: string; code: string; name: string; usableQuantity: number };
}

export interface AssignmentInfo {
  id: string;
  eventId: string;
  roleInEvent: string;
  jobStatus: string;
  status: 'ACTIVE' | 'CANCELLED';
  startAt: string;
  endAt: string;
  notes: string | null;
  crewProfile?: {
    id: string;
    user: { id: string; fullName: string; email: string };
  };
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

export interface AvailabilityInfo {
  equipmentId: string;
  usableQuantity: number;
  allocatedOnInterval: number;
  availableOnInterval: number;
  startAt: string;
  endAt: string;
}

export interface CreateEventBody {
  code: string;
  name: string;
  clientName?: string;
  location: string;
  timezone?: string;
  startAt: string;
  endAt: string;
  notes?: string;
  responsibleUserId?: string;
}

export interface CreateEquipmentBody {
  categoryId: string;
  code: string;
  name: string;
  description?: string;
  quantityOnHand: number;
  usableQuantity: number;
  condition?: string;
  storageLocation: string;
  notes?: string;
}

export interface CreateUserBody {
  email: string;
  password: string;
  fullName: string;
  role: 'ADMIN' | 'CREW';
  phone?: string;
  skills?: string;
}

export interface UpdateUserBody {
  fullName?: string;
  isActive?: boolean;
  phone?: string;
  skills?: string;
}

export interface UpdateEquipmentBody {
  name?: string;
  description?: string | null;
  quantityOnHand?: number;
  usableQuantity?: number;
  condition?: string;
  storageLocation?: string;
  notes?: string | null;
  isActive?: boolean;
  categoryId?: string;
}

export interface CreateAllocationBody {

  equipmentId: string;
  quantity: number;
  startAt: string;
  endAt: string;
  notes?: string;
}


export interface CreateAssignmentBody {
  crewProfileId: string;
  roleInEvent: string;
  startAt: string;
  endAt: string;
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toQS(params?: Record<string, string>): string {
  if (!params) return '';
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
  ).toString();
  return qs ? `?${qs}` : '';
}
