import type { AppointmentStatus } from "@/services/appointments";

export const appointmentStatusMeta: Record<AppointmentStatus, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Đã duyệt", className: "bg-blue-100 text-blue-800" },
  REJECTED: { label: "Đã từ chối", className: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Đã hủy", className: "bg-slate-200 text-slate-700" },
  CHECKED_IN: { label: "Đã check-in", className: "bg-cyan-100 text-cyan-800" },
  IN_SERVICE: { label: "Đang tiếp nhận", className: "bg-violet-100 text-violet-800" },
  COMPLETED: { label: "Đã hoàn thành", className: "bg-emerald-100 text-emerald-800" },
  NO_SHOW: { label: "Không đến", className: "bg-orange-100 text-orange-800" },
};
export type AppointmentAction = "approve" | "reject" | "reschedule" | "cancel" | "checkIn" | "start" | "complete" | "noShow";
export function actionsForStatus(status: AppointmentStatus): AppointmentAction[] {
  if (status === "PENDING") return ["approve", "reject", "reschedule"];
  if (status === "APPROVED") return ["checkIn", "reschedule", "cancel", "noShow"];
  if (status === "CHECKED_IN") return ["start"];
  if (status === "IN_SERVICE") return ["complete"];
  return [];
}
export function formatDateOnly(value?: string) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
export function formatTimestamp(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}
export function personName(value?: { name?: string; username?: string }) { return value?.name || value?.username || "—"; }
