import { ensureStoredAdminToken } from "@/services/auth.service";
import { getUsers, type User } from "@/services/users";

export type TicketStatus =
  | "WAITING" | "SERVING" | "COMPLETED" | "CANCELLED" | "SKIPPED" | "EXPIRED";

export type Desk = {
  id: string;
  name: string;
  code: string;
  category: string;
  services: string;
  waiting: number;
  isActive: boolean;
  sortOrder: number;
};

export type DeskAssignee = Pick<User,
  "id" | "username" | "name" | "avatar" | "phone" | "role" | "status">;

export type DashboardDesk = {
  deskId: string;
  deskName: string;
  deskCode: string;
  assignees: Array<{ id: string; name: string }>;
  waiting: number;
  serving: number;
  completed: number;
  cancelled: number;
  skipped: number;
  expired?: number;
  currentNumber: string | null;
};

export type QueueDashboard = { date: string; desks: DashboardDesk[] };

export type Ticket = {
  id: string;
  number: string;
  deskId: string;
  deskName: string;
  deskCode: string;
  category: string;
  serviceDate: string;
  createdAt: string;
  updatedAt?: string;
  status: TicketStatus;
  peopleAhead: number;
  cancelReason: string | null;
  servedAt: string | null;
  completedAt: string | null;
};

export type TicketPage = {
  items: Ticket[];
  total: number;
  page: number;
  size: number;
};

export type DeskPayload = {
  name: string;
  code: string;
  category: string;
  services: string;
  isActive: boolean;
  sortOrder: number;
};

export class RemoteQueueError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "RemoteQueueError";
  }
}

type Wrapper<T> = { success: boolean; message?: string; data: T };

function isWrapper<T>(value: unknown): value is Wrapper<T> {
  return typeof value === "object" && value !== null && "data" in value && "success" in value;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureStoredAdminToken();
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  if (!response.ok) {
    const value = body as { message?: string | string[]; error?: string } | null;
    const message = Array.isArray(value?.message)
      ? value.message.join(", ")
      : value?.message || value?.error || `Không thể xử lý yêu cầu (${response.status}).`;
    throw new RemoteQueueError(message, response.status);
  }
  return isWrapper<T>(body) ? body.data : body as T;
}

function query(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

export const remoteQueueApi = {
  desks: (includeInactive = false) =>
    request<{ items: Desk[] }>(`/remote-queue/desks${query({ includeInactive })}`),
  createDesk: (payload: DeskPayload) =>
    request<Desk>("/remote-queue/desks", { method: "POST", body: JSON.stringify(payload) }),
  updateDesk: (id: string, payload: Partial<DeskPayload>) =>
    request<Desk>(`/remote-queue/desks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  assignees: (id: string) =>
    request<{ items: DeskAssignee[] }>(`/remote-queue/desks/${id}/assignees`),
  updateAssignees: (id: string, userIds: string[]) =>
    request<{ items?: DeskAssignee[] }>(`/remote-queue/desks/${id}/assignees`, {
      method: "PATCH", body: JSON.stringify({ userIds }),
    }),
  users: () => getUsers({ page: 0, size: 500 }),
  dashboard: (date: string) =>
    request<QueueDashboard>(`/remote-queue/dashboard${query({ date })}`),
  tickets: (filters: {
    date: string; deskId?: string; status?: TicketStatus | ""; page: number; size: number;
  }) => request<TicketPage>(`/remote-queue/admin/tickets${query(filters)}`),
  updateStatus: (id: string, status: Exclude<TicketStatus, "WAITING" | "CANCELLED">) =>
    request<Ticket>(`/remote-queue/tickets/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
};
