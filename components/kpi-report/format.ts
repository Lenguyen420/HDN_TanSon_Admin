import type {
  KpiReportTask,
  KpiReportUser,
  KpiStatusCounts,
  TaskStatus,
} from "@/services/kpi-report";

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng",
  ADMIN: "Quản trị viên",
  WARD_CHAIRMAN: "Chủ tịch phường",
  NEIGHBORHOOD_HEAD: "Trưởng khu phố",
};

type StatusMeta = {
  label: string;
  /** Khóa đếm tương ứng trong `summary` / nhóm nhân viên. */
  countKey: keyof KpiStatusCounts;
  /** Màu nền dùng cho biểu đồ phân bổ (đã kiểm bằng validator độ tương phản). */
  chartColor: string;
  badgeClass: string;
  dotClass: string;
  textClass: string;
};

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  ASSIGNED: {
    label: "Đã giao",
    countKey: "pending",
    chartColor: "#64748b",
    badgeClass: "border-slate-300 bg-slate-100 text-slate-700",
    dotClass: "bg-slate-500",
    textClass: "text-slate-700",
  },
  SUBMITTED: {
    label: "Chờ đánh giá",
    countKey: "submitted",
    chartColor: "#2563eb",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    dotClass: "bg-blue-600",
    textClass: "text-blue-700",
  },
  COMPLETED: {
    label: "Hoàn thành",
    countKey: "completed",
    chartColor: "#059669",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-600",
    textClass: "text-emerald-700",
  },
  INCOMPLETE: {
    label: "Chưa hoàn thành",
    countKey: "incomplete",
    chartColor: "#dc2626",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-600",
    textClass: "text-red-700",
  },
  REJECTED: {
    label: "Từ chối nhận",
    countKey: "rejected",
    chartColor: "#d97706",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-600",
    textClass: "text-amber-800",
  },
};

/**
 * Thứ tự hiển thị của các trạng thái: đặt cạnh nhau các màu tách biệt rõ
 * (đỏ không nằm cạnh cam) để đọc được cả khi mù màu.
 */
export const STATUS_DISPLAY_ORDER: TaskStatus[] = [
  "COMPLETED",
  "INCOMPLETE",
  "SUBMITTED",
  "ASSIGNED",
  "REJECTED",
];

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

export const EMPTY_VALUE = "—";

/**
 * Luôn trả về đúng thứ tự `DD/MM/YYYY HH:mm` theo giờ Việt Nam — locale vi-VN
 * mặc định đặt phần giờ lên trước nên phải tự ghép từ `formatToParts`.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return EMPTY_VALUE;
  }

  const parts = new Map(
    dateTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const day = parts.get("day");
  const month = parts.get("month");
  const year = parts.get("year");
  const hour = parts.get("hour");
  const minute = parts.get("minute");

  if (!day || !month || !year || !hour || !minute) {
    return dateTimeFormatter.format(date);
  }

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? EMPTY_VALUE : dateFormatter.format(date);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatSigned(value: number, sign: "+" | "-"): string {
  return value === 0 ? "0" : `${sign}${formatNumber(Math.abs(value))}`;
}

export function formatFileSize(size: number | null): string {
  if (size === null || size <= 0) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getUserDisplayName(user: KpiReportUser | null): string {
  if (!user) {
    return EMPTY_VALUE;
  }

  return user.name ?? user.username ?? EMPTY_VALUE;
}

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) {
    return EMPTY_VALUE;
  }

  return ROLE_LABELS[role] ?? role;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const last = parts[parts.length - 1];

  return (parts.length === 1 ? last.slice(0, 2) : `${parts[0][0]}${last[0]}`).toUpperCase();
}

/** Việc quá hạn: đã qua `deadline` mà vẫn ở trạng thái `ASSIGNED`. */
export function isOverdue(task: KpiReportTask, now = Date.now()): boolean {
  if (task.status !== "ASSIGNED" || !task.deadline) {
    return false;
  }

  const deadline = new Date(task.deadline).getTime();

  return Number.isFinite(deadline) && deadline < now;
}

export function getStatusCount(
  counts: KpiStatusCounts,
  status: TaskStatus,
): number {
  return counts[STATUS_META[status].countKey];
}

export function getCompletionPercent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export function getMonthOptions(): Array<{ value: number; label: string }> {
  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: `Tháng ${index + 1}`,
  }));
}

export function getYearOptions(current = new Date().getFullYear()): number[] {
  return Array.from({ length: 7 }, (_, index) => current + 1 - index);
}
