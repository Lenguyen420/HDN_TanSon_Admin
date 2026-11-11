import { clearAdminAuth, ensureStoredAdminToken } from "@/services/auth.service";

export type SystemRole = "USER" | "ADMIN" | "WARD_CHAIRMAN" | "NEIGHBORHOOD_HEAD";

export type TaskStatus =
  | "ASSIGNED"
  | "SUBMITTED"
  | "COMPLETED"
  | "INCOMPLETE"
  | "REJECTED";

export const TASK_STATUSES: TaskStatus[] = [
  "ASSIGNED",
  "SUBMITTED",
  "COMPLETED",
  "INCOMPLETE",
  "REJECTED",
];

export interface KpiReportUser {
  id: string;
  name: string | null;
  username: string | null;
  role: SystemRole | string | null;
  phone: string | null;
  avatar: string | null;
}

export interface TaskAttachment {
  id: string;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  order: number | null;
}

export interface KpiBoardRef {
  id: string;
  title: string | null;
  month: number | null;
  year: number | null;
}

export interface KpiReportTask {
  id: string;
  title: string | null;
  points: number;
  deadline: string | null;
  status: TaskStatus;
  earnedPoints: number;
  deductedPoints: number;
  rejectionReason: string | null;
  incompleteNote: string | null;
  submittedAt: string | null;
  evaluatedAt: string | null;
  board: KpiBoardRef | null;
  /** Chỉ có ở API chi tiết theo nhân viên (`GET /kpi-report/{assigneeId}`). */
  content: string | null;
  chairman: KpiReportUser | null;
  attachments: TaskAttachment[];
  submissionAttachments: TaskAttachment[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface KpiStatusCounts {
  completed: number;
  incomplete: number;
  rejected: number;
  pending: number;
  submitted: number;
}

export interface KpiReportUserGroup extends KpiStatusCounts {
  user: KpiReportUser | null;
  earned: number;
  deducted: number;
  tasks: KpiReportTask[];
  totalTasks: number;
  score: number;
}

export interface KpiReportResponse {
  month: number;
  year: number;
  initialPoints: number;
  totalTasks: number;
  users: KpiReportUserGroup[];
  summary: KpiStatusCounts;
}

export interface EmployeeKpiReport extends KpiStatusCounts {
  month: number;
  year: number;
  initialPoints: number;
  user: KpiReportUser | null;
  earned: number;
  deducted: number;
  totalTasks: number;
  score: number;
  tasks: KpiReportTask[];
}

export interface KpiReportFilters {
  month?: number | string;
  year?: number | string;
  assigneeId?: string;
}

export interface AssignmentOptionUser {
  id: string;
  name: string | null;
  username: string | null;
  role: SystemRole | string | null;
}

export interface TaskAssignmentOptions {
  roles: string[];
  statuses: string[];
  chairmen: AssignmentOptionUser[];
  neighborhoodHeads: AssignmentOptionUser[];
}

export class KpiReportError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "KpiReportError";
    this.statusCode = statusCode;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://be.government.kidoedu.vn";
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? "";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function toRequiredText(value: unknown, fallback = ""): string {
  return toText(value) ?? fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function toStatus(value: unknown): TaskStatus {
  const status = toRequiredText(value).toUpperCase();

  return (TASK_STATUSES as string[]).includes(status)
    ? (status as TaskStatus)
    : "ASSIGNED";
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringArray(value: unknown): string[] {
  return toArray(value)
    .map((item) => toText(item))
    .filter((item): item is string => item !== null);
}

function parseUser(value: unknown): KpiReportUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toRequiredText(value.id);
  const name = toText(value.name);
  const username = toText(value.username);

  if (!id && !name && !username) {
    return null;
  }

  return {
    id,
    name,
    username,
    role: toText(value.role),
    phone: toText(value.phone),
    avatar: toText(value.avatar),
  };
}

function parseAttachment(value: unknown, index: number): TaskAttachment | null {
  if (!isRecord(value)) {
    return null;
  }

  const url = toText(value.url) ?? toText(value.path);

  if (!url) {
    return null;
  }

  return {
    id: toRequiredText(value.id, `attachment-${index}`),
    url,
    fileName: toText(value.fileName) ?? toText(value.name),
    mimeType: toText(value.mimeType) ?? toText(value.type),
    size: toNullableNumber(value.size),
    order: toNullableNumber(value.order) ?? index,
  };
}

function parseAttachments(value: unknown): TaskAttachment[] {
  return toArray(value)
    .map((item, index) => parseAttachment(item, index))
    .filter((item): item is TaskAttachment => item !== null)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

function parseBoard(value: unknown): KpiBoardRef | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toRequiredText(value.id);
  const title = toText(value.title);

  if (!id && !title) {
    return null;
  }

  return {
    id,
    title,
    month: toNullableNumber(value.month),
    year: toNullableNumber(value.year),
  };
}

function parseTask(value: unknown, index: number): KpiReportTask | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: toRequiredText(value.id, `task-${index}`),
    title: toText(value.title),
    points: toNumber(value.points),
    deadline: toText(value.deadline),
    status: toStatus(value.status),
    earnedPoints: toNumber(value.earnedPoints),
    deductedPoints: toNumber(value.deductedPoints),
    rejectionReason: toText(value.rejectionReason),
    incompleteNote: toText(value.incompleteNote),
    submittedAt: toText(value.submittedAt),
    evaluatedAt: toText(value.evaluatedAt),
    board: parseBoard(value.board),
    content: toText(value.content),
    chairman: parseUser(value.chairman),
    attachments: parseAttachments(value.attachments),
    submissionAttachments: parseAttachments(value.submissionAttachments),
    createdAt: toText(value.createdAt),
    updatedAt: toText(value.updatedAt),
  };
}

function parseTasks(value: unknown): KpiReportTask[] {
  return toArray(value)
    .map((item, index) => parseTask(item, index))
    .filter((item): item is KpiReportTask => item !== null);
}

function parseStatusCounts(value: unknown): KpiStatusCounts {
  const record = isRecord(value) ? value : {};

  return {
    completed: toNumber(record.completed),
    incomplete: toNumber(record.incomplete),
    rejected: toNumber(record.rejected),
    pending: toNumber(record.pending),
    submitted: toNumber(record.submitted),
  };
}

function parseUserGroup(value: unknown): KpiReportUserGroup {
  const record = isRecord(value) ? value : {};
  const tasks = parseTasks(record.tasks);

  return {
    ...parseStatusCounts(record),
    user: parseUser(record.user),
    earned: toNumber(record.earned),
    deducted: toNumber(record.deducted),
    tasks,
    totalTasks: toNumber(record.totalTasks, tasks.length),
    score: toNumber(record.score),
  };
}

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

function currentYear(): number {
  return new Date().getFullYear();
}

function parseReport(value: unknown): KpiReportResponse {
  const record = isRecord(value) ? value : {};

  return {
    month: toNumber(record.month, currentMonth()),
    year: toNumber(record.year, currentYear()),
    initialPoints: toNumber(record.initialPoints, 100),
    totalTasks: toNumber(record.totalTasks),
    users: toArray(record.users).map(parseUserGroup),
    summary: parseStatusCounts(record.summary),
  };
}

function parseEmployeeReport(value: unknown): EmployeeKpiReport {
  const record = isRecord(value) ? value : {};
  const tasks = parseTasks(record.tasks);

  return {
    ...parseStatusCounts(record),
    month: toNumber(record.month, currentMonth()),
    year: toNumber(record.year, currentYear()),
    initialPoints: toNumber(record.initialPoints, 100),
    user: parseUser(record.user),
    earned: toNumber(record.earned),
    deducted: toNumber(record.deducted),
    totalTasks: toNumber(record.totalTasks, tasks.length),
    score: toNumber(record.score),
    tasks,
  };
}

function parseOptionUser(value: unknown): AssignmentOptionUser | null {
  const user = parseUser(value);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

function parseOptionUsers(value: unknown): AssignmentOptionUser[] {
  return toArray(value)
    .map(parseOptionUser)
    .filter((item): item is AssignmentOptionUser => item !== null);
}

function parseAssignmentOptions(value: unknown): TaskAssignmentOptions {
  const record = isRecord(value) ? value : {};

  return {
    roles: toStringArray(record.roles),
    statuses: toStringArray(record.statuses),
    chairmen: parseOptionUsers(record.chairmen),
    neighborhoodHeads: parseOptionUsers(record.neighborhoodHeads),
  };
}

function buildQuery(filters?: KpiReportFilters): string {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body)) {
    return fallback;
  }

  const { message } = body;

  if (Array.isArray(message)) {
    const joined = message
      .map((item) => toText(item))
      .filter((item): item is string => item !== null)
      .join(", ");

    return joined || fallback;
  }

  return toText(message) ?? toText(body.error) ?? fallback;
}

/**
 * Mọi response thành công đều được bọc `{ success, message, data }`.
 * Luôn đọc phần `data` bên trong.
 */
function unwrap(body: unknown): unknown {
  if (isRecord(body) && "success" in body && "data" in body) {
    return body.data;
  }

  return body;
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  clearAdminAuth();

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function kpiRequest(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const token = await ensureStoredAdminToken();
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
    }

    throw new KpiReportError(
      readErrorMessage(body, `Yêu cầu thất bại (${response.status}).`),
      response.status,
    );
  }

  return unwrap(body);
}

export const kpiReportApi = {
  /** `GET /kpi-report?month=&year=&assigneeId=` — báo cáo tổng hợp nhóm theo nhân viên. */
  async getReport(filters?: KpiReportFilters): Promise<KpiReportResponse> {
    return parseReport(await kpiRequest(`/kpi-report${buildQuery(filters)}`));
  },

  /** `GET /kpi-report/{assigneeId}?month=&year=` — báo cáo điểm chi tiết 1 nhân viên. */
  async getEmployeeReport(
    assigneeId: string,
    filters?: Omit<KpiReportFilters, "assigneeId">,
  ): Promise<EmployeeKpiReport> {
    if (!isUuid(assigneeId)) {
      throw new KpiReportError("Mã nhân viên không hợp lệ.", 400);
    }

    return parseEmployeeReport(
      await kpiRequest(`/kpi-report/${assigneeId}${buildQuery(filters)}`),
    );
  },

  /** `GET /task-assignment-options` — dữ liệu đổ dropdown lọc nhân viên. */
  async getAssignmentOptions(): Promise<TaskAssignmentOptions> {
    return parseAssignmentOptions(await kpiRequest("/task-assignment-options"));
  },

  /** `PATCH /ward-tasks/{id}/evaluation` — chấm điểm nhanh (ADMIN / WARD_CHAIRMAN). */
  async evaluateTask(
    taskId: string,
    payload: { status: "COMPLETED" | "INCOMPLETE"; note?: string },
  ): Promise<void> {
    await kpiRequest(`/ward-tasks/${taskId}/evaluation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

export function getKpiErrorMessage(error: unknown): string {
  if (error instanceof KpiReportError) {
    if (error.statusCode === 403) {
      return "Bạn không có quyền xem báo cáo này.";
    }

    if (error.statusCode === 404) {
      return "Không tìm thấy nhân viên tương ứng.";
    }

    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Không tải được báo cáo điểm.";
}
