import {
  adminRequest,
  normalizeList,
  normalizeSingle,
  type AdminRecord,
  type ListQuery,
} from "@/services/admin-api";
import { ensureStoredAdminToken } from "@/services/auth.service";

export type SystemRole =
  | "USER"
  | "ADMIN"
  | "WARD_CHAIRMAN"
  | "NEIGHBORHOOD_HEAD";

export type TaskStatus =
  | "ASSIGNED"
  | "SUBMITTED"
  | "COMPLETED"
  | "INCOMPLETE"
  | "REJECTED";

export type WardTask = AdminRecord & {
  id?: string | number;
  title?: string;
  content?: string;
  points?: number;
  deadline?: string;
  status?: TaskStatus | string;
  assigneeId?: string | number;
  attachments?: AdminRecord[];
  submissionAttachments?: AdminRecord[];
};

export type PointReport = AdminRecord & {
  month?: number;
  year?: number;
  initialPoints?: number;
  totalTasks?: number;
  user?: AdminRecord;
  assigneeId?: string | number;
  assigneeName?: string;
  completed?: number;
  incomplete?: number;
  rejected?: number;
  pending?: number;
  submitted?: number;
  earned?: number;
  deducted?: number;
  score?: number;
};

export type TaskNotification = AdminRecord & {
  id?: string | number;
  title?: string;
  message?: string;
  content?: string;
  type?: string;
  readAt?: string | null;
  isRead?: boolean;
};

export type TaskAssignmentOptions = AdminRecord & {
  neighborhoodHeads?: AdminRecord[];
};

function buildQuery(query?: ListQuery) {
  if (!query) return "";

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

function isRecord(value: unknown): value is AdminRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapData(value: unknown): unknown {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }

  return value;
}

function normalizePointReportRows(value: unknown): PointReport[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).flatMap((report) => {
    const users = report.users;

    if (!Array.isArray(users)) {
      return [report as PointReport];
    }

    return users.filter(isRecord).map((userReport) => {
      const user = isRecord(userReport.user) ? userReport.user : {};

      return {
        ...userReport,
        month: report.month,
        year: report.year,
        initialPoints: userReport.initialPoints ?? report.initialPoints,
        totalTasks: userReport.totalTasks ?? report.totalTasks,
        summary: report.summary,
        user,
        assigneeId: userReport.assigneeId ?? user.id,
        assigneeName: userReport.assigneeName ?? user.name ?? user.username,
      } as PointReport;
    });
  });
}

async function formRequest(path: string, formData: FormData) {
  const token = await ensureStoredAdminToken();

  const body = await adminRequest<unknown>(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return normalizeSingle(body);
}

export async function getTaskAssignmentOptions(): Promise<TaskAssignmentOptions> {
  const body = await adminRequest<unknown>("/task-assignment-options", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    cache: "no-store",
  });

  return normalizeSingle(body) as TaskAssignmentOptions;
}

export async function getAssignedTasks(query?: ListQuery): Promise<WardTask[]> {
  const body = await adminRequest<unknown>(`/assigned-tasks${buildQuery(query)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    cache: "no-store",
  });

  return normalizeList(body) as WardTask[];
}

export async function createAssignedTask(formData: FormData): Promise<WardTask> {
  return formRequest("/assigned-tasks", formData) as Promise<WardTask>;
}

export async function getReceivedTasks(query?: ListQuery): Promise<WardTask[]> {
  const body = await adminRequest<unknown>(`/received-tasks${buildQuery(query)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    cache: "no-store",
  });

  return normalizeList(body) as WardTask[];
}

export async function getWardTask(id: string | number): Promise<WardTask> {
  const body = await adminRequest<unknown>(`/ward-tasks/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    cache: "no-store",
  });

  return normalizeSingle(body) as WardTask;
}

export async function evaluateWardTask(
  id: string | number,
  payload: { status: "COMPLETED" | "INCOMPLETE"; note?: string },
): Promise<WardTask> {
  const body = await adminRequest<unknown>(`/ward-tasks/${id}/evaluation`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    body: JSON.stringify(payload),
  });

  return normalizeSingle(body) as WardTask;
}

export async function completeWardTask(
  id: string | number,
  formData: FormData,
): Promise<WardTask> {
  return formRequest(`/ward-tasks/${id}/complete`, formData) as Promise<WardTask>;
}

export async function rejectWardTask(
  id: string | number,
  payload: { reason: string },
): Promise<WardTask> {
  const body = await adminRequest<unknown>(`/ward-tasks/${id}/reject`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    body: JSON.stringify(payload),
  });

  return normalizeSingle(body) as WardTask;
}

export async function getPointReport(query?: ListQuery): Promise<PointReport[]> {
  const body = await adminRequest<unknown>(`/kpi-report${buildQuery(query)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    cache: "no-store",
  });

  const unwrapped = unwrapData(body);

  if (Array.isArray(unwrapped)) {
    return normalizePointReportRows(unwrapped);
  }

  if (isRecord(unwrapped)) {
    const candidates = [
      unwrapped.items,
      unwrapped.data,
      unwrapped.reports,
      unwrapped.results,
      unwrapped.assignees,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return normalizePointReportRows(candidate);
      }
    }

    return [unwrapped] as PointReport[];
  }

  const list = normalizeList(body);

  if (list.length > 0) {
    return normalizePointReportRows(list);
  }

  return [];
}

export async function getTaskNotifications(): Promise<TaskNotification[]> {
  const body = await adminRequest<unknown>("/task-notifications", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
    cache: "no-store",
  });

  return normalizeList(body) as TaskNotification[];
}

export async function markTaskNotificationRead(id: string | number): Promise<void> {
  await adminRequest<unknown>(`/task-notifications/${id}/read`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await ensureStoredAdminToken()}`,
    },
  });
}
