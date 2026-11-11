import { ensureStoredAdminToken } from "@/services/auth.service";

export const APPOINTMENT_TIMEZONE = "Asia/Ho_Chi_Minh";
export type AppointmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "CHECKED_IN" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW";
export type PersonRef = { id?: string; name?: string; username?: string };
export type DeskRef = { id?: string; name?: string; code?: string };
export type AppointmentHistory = {
  id?: string; fromStatus?: AppointmentStatus; toStatus?: AppointmentStatus; status?: AppointmentStatus;
  actor?: PersonRef; createdAt?: string; timestamp?: string; reason?: string; metadata?: Record<string, unknown>;
};
export type Appointment = {
  id: string; code: string; userId?: string; deskId: string; departmentId?: string;
  serviceName: string; appointmentDate: string; startTime: string; endTime: string;
  status: AppointmentStatus; note?: string; notes?: string; contactName?: string;
  contactPhone?: string; contactEmail?: string; attachmentIds?: string[]; reason?: string;
  assignedUserId?: string; handlerUserId?: string; checkedInAt?: string; startedAt?: string;
  completedAt?: string; createdAt?: string; updatedAt?: string; desk?: DeskRef;
  assignedUser?: PersonRef; handler?: PersonRef; history?: AppointmentHistory[]; timezone?: string;
};
export type AppointmentPage = { items: Appointment[]; total: number; page: number; size: number; timezone?: string };
export type AvailabilitySlot = { startTime: string; endTime: string; remaining: number };
export type Availability = { deskId: string; date: string; timezone: string; slots: AvailabilitySlot[] };
export type Rating = {
  id: string; appointmentId?: string; appointmentCode?: string; ratedUserId?: string; ratedUser?: PersonRef;
  deskId?: string; desk?: DeskRef; score?: number; rating?: number; comment?: string; content?: string;
  criteria?: Record<string, unknown> | Array<{ name?: string; label?: string; score?: number; value?: unknown }>;
  rater?: PersonRef; user?: PersonRef; createdAt?: string;
};
export type RatingPage = { items: Rating[]; total: number; page: number; size: number; stats: { total: number; average: number } };
export type CallNextResult = { serviceType: "APPOINTMENT" | "ONLINE_TICKET"; item: Appointment | Record<string, unknown> } | null;
export class AppointmentApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "AppointmentApiError"; }
}
type Wrapper<T> = { success: boolean; message?: string; data: T };
function wrapped<T>(value: unknown): value is Wrapper<T> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value;
}
function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.size ? `?${params}` : "";
}
async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const token = await ensureStoredAdminToken();
  const response = await fetch(`/api/backend${path}`, {
    ...init, signal, cache: "no-store",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  if (!response.ok) {
    const error = body as { message?: string | string[]; error?: string } | null;
    throw new AppointmentApiError(Array.isArray(error?.message) ? error.message.join(", ") :
      error?.message || error?.error || `Không thể xử lý yêu cầu (${response.status}).`, response.status);
  }
  return wrapped<T>(body) ? body.data : body as T;
}
export type AppointmentFilters = { page: number; size: number; status?: string; date?: string; deskId?: string; serviceName?: string };
const patch = <T>(id: string, action: string, body?: object) => request<T>(`/appointments/${id}/${action}`, {
  method: "PATCH", ...(body ? { body: JSON.stringify(body) } : {}),
});
export const appointmentsApi = {
  list: (filters: AppointmentFilters, signal?: AbortSignal) => request<AppointmentPage>(`/appointments/admin${query(filters)}`, {}, signal),
  detail: (id: string, signal?: AbortSignal) => request<Appointment>(`/appointments/${id}`, {}, signal),
  approve: (id: string) => patch<Appointment>(id, "approve"),
  reject: (id: string, reason: string) => patch<Appointment>(id, "reject", { reason }),
  reschedule: (id: string, payload: { appointmentDate: string; startTime: string; endTime: string; reason: string }) => patch<Appointment>(id, "reschedule", payload),
  cancel: (id: string, reason: string) => patch<Appointment>(id, "cancel", { reason }),
  checkIn: (id: string, note?: string) => patch<Appointment>(id, "check-in", note ? { note } : {}),
  start: (id: string) => patch<Appointment>(id, "start"),
  complete: (id: string) => patch<Appointment>(id, "complete"),
  noShow: (id: string) => patch<Appointment>(id, "no-show"),
  availability: (deskId: string, date: string, signal?: AbortSignal) => request<Availability>(`/appointments/availability${query({ deskId, date })}`, {}, signal),
  callNext: (deskId: string) => request<CallNextResult>(`/appointments/desks/${deskId}/call-next`, { method: "POST" }),
  ratings: (filters: { page: number; size: number; deskId?: string; ratedUserId?: string; from?: string; to?: string }, signal?: AbortSignal) =>
    request<RatingPage>(`/appointments/admin/ratings${query(filters)}`, {}, signal),
};
