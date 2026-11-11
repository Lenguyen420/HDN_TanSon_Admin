"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  FileDown,
  FilterX,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TimerOff,
  TrendingDown,
  TrendingUp,
  UserCheck,
  XCircle,
} from "lucide-react";

import {
  completeWardTask,
  createAssignedTask,
  evaluateWardTask,
  getAssignedTasks,
  getPointReport,
  getReceivedTasks,
  getTaskAssignmentOptions,
  getWardTask,
  rejectWardTask,
  type PointReport,
  type TaskAssignmentOptions,
  type TaskStatus,
  type WardTask,
} from "@/services/task-management";
import { getAdminSystemRole, getStoredAdminUser } from "@/services/auth.service";

type Notice = {
  kind: "success" | "error" | "info";
  message: string;
};

const statusLabels: Record<TaskStatus, string> = {
  ASSIGNED: "Đã giao",
  SUBMITTED: "Đã nộp - Chờ duyệt",
  COMPLETED: "Hoàn thành",
  INCOMPLETE: "Chưa hoàn thành",
  REJECTED: "Từ chối",
};

const statusClasses: Record<TaskStatus, string> = {
  ASSIGNED: "border-blue-200 bg-blue-50 text-blue-700",
  SUBMITTED: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INCOMPLETE: "border-red-200 bg-red-50 text-red-700",
  REJECTED: "border-slate-300 bg-slate-100 text-slate-700",
};

const taskStatuses: Array<{ value: "" | TaskStatus; label: string }> = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ASSIGNED", label: statusLabels.ASSIGNED },
  { value: "SUBMITTED", label: statusLabels.SUBMITTED },
  { value: "COMPLETED", label: statusLabels.COMPLETED },
  { value: "INCOMPLETE", label: statusLabels.INCOMPLETE },
  { value: "REJECTED", label: statusLabels.REJECTED },
];

function getText(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function getId(value: unknown) {
  return getText(value) || "";
}

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDate(value: unknown) {
  const text = getText(value);

  if (!text) return "-";

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleString("vi-VN");
}

function formatNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? new Intl.NumberFormat("vi-VN").format(number) : "0";
}

function getCurrentMonthText() {
  return String(new Date().getMonth() + 1);
}

function getCurrentYearText() {
  return String(new Date().getFullYear());
}

function getStatus(value: unknown): TaskStatus {
  const status = getText(value).toUpperCase() as TaskStatus;

  return statusLabels[status] ? status : "ASSIGNED";
}

function NoticeBox({ notice }: { notice: Notice }) {
  const className = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  }[notice.kind];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${className}`}>
      {notice.message}
    </div>
  );
}

function Toolbar({
  keyword,
  month,
  year,
  status,
  onKeyword,
  onMonth,
  onYear,
  onStatus,
  onRefresh,
}: {
  keyword: string;
  month: string;
  year: string;
  status?: string;
  onKeyword: (value: string) => void;
  onMonth: (value: string) => void;
  onYear: (value: string) => void;
  onStatus?: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_140px_170px_auto]">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
          onChange={(event) => onKeyword(event.target.value)}
          placeholder="Tìm kiếm"
          value={keyword}
        />
      </label>
      <input
        className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
        max="12"
        min="1"
        onChange={(event) => onMonth(event.target.value)}
        placeholder="Tháng"
        type="number"
        value={month}
      />
      <input
        className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
        min="2020"
        onChange={(event) => onYear(event.target.value)}
        placeholder="Năm"
        type="number"
        value={year}
      />
      {onStatus ? (
        <select
          className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
          onChange={(event) => onStatus(event.target.value)}
          value={status}
        >
          {taskStatuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <span />
      )}
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        onClick={onRefresh}
        type="button"
      >
        <RefreshCw className="h-4 w-4" />
        Làm mới
      </button>
    </div>
  );
}

function PageFrame({
  title,
  description,
  action,
  notice,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  notice: Notice;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[24px] border border-blue-900/10 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />
        <div className="flex flex-col gap-4 bg-blue-950 p-6 text-white lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
              Giao việc khu phố
            </p>
            <h1 className="mt-3 text-2xl font-extrabold">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
              {description}
            </p>
          </div>
          {action}
        </div>
      </section>
      <NoticeBox notice={notice} />
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: unknown }) {
  const key = getStatus(status);

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[key]}`}>
      {statusLabels[key]}
    </span>
  );
}

function FileList({ files }: { files?: unknown }) {
  const list = Array.isArray(files) ? files : [];

  if (list.length === 0) {
    return <span className="text-xs text-slate-400">Không có tệp</span>;
  }

  return (
    <div className="space-y-2">
      {list.map((file, index) => {
        const record = typeof file === "object" && file ? (file as Record<string, unknown>) : {};
        const url = getText(record.url) || getText(record.path);
        const name = getText(record.name) || getText(record.filename) || `Tệp ${index + 1}`;
        const size = getText(record.size);

        return (
          <a
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
            href={url || "#"}
            key={`${name}-${index}`}
            rel="noreferrer"
            target="_blank"
          >
            <FileDown className="h-4 w-4 shrink-0" />
            <span className="truncate">{name}</span>
            {size ? <span className="shrink-0 text-slate-400">{size}</span> : null}
          </a>
        );
      })}
    </div>
  );
}

function headsFromOptions(options: TaskAssignmentOptions) {
  return Array.isArray(options.neighborhoodHeads) ? options.neighborhoodHeads : [];
}

export function AssignedTasksPage() {
  return <TasksPage mode="assigned" />;
}

export function ReceivedTasksPage() {
  return <TasksPage mode="received" />;
}

function TasksPage({ mode }: { mode: "assigned" | "received" }) {
  const [tasks, setTasks] = useState<WardTask[]>([]);
  const [options, setOptions] = useState<TaskAssignmentOptions>({});
  const [keyword, setKeyword] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("2026");
  const [status, setStatus] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [detail, setDetail] = useState<WardTask | null>(null);
  const [notice, setNotice] = useState<Notice>({ kind: "info", message: "Đang tải danh sách công việc..." });
  const isAssigned = mode === "assigned";

  const loadTasks = useCallback(async () => {
    try {
      const query = {
        page: 0,
        size: 100,
        keyword,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        status,
      };
      const [taskData, optionData] = await Promise.all([
        isAssigned ? getAssignedTasks(query) : getReceivedTasks(query),
        getTaskAssignmentOptions().catch(() => ({})),
      ]);
      setTasks(taskData);
      setOptions(optionData);
      setNotice({ kind: "success", message: `Đã tải ${taskData.length} công việc.` });
    } catch (error) {
      setTasks([]);
      setNotice({ kind: "error", message: getError(error, "Không tải được danh sách công việc.") });
    }
  }, [isAssigned, keyword, month, year, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTasks();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTasks]);

  async function openDetail(task: WardTask) {
    try {
      setDetail(await getWardTask(getId(task.id)));
    } catch {
      setDetail(task);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await createAssignedTask(formData);
      setOpenCreate(false);
      await loadTasks();
      setNotice({ kind: "success", message: "Đã giao việc mới." });
    } catch (error) {
      setNotice({ kind: "error", message: getError(error, "Không tạo được công việc.") });
    }
  }

  return (
    <PageFrame
      action={
        isAssigned ? (
          <button className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-3 text-sm font-bold text-blue-950" onClick={() => setOpenCreate(true)} type="button">
            <Plus className="h-4 w-4" />
            Giao việc
          </button>
        ) : undefined
      }
      description={isAssigned ? "Tạo việc, theo dõi việc đã giao và đánh giá kết quả trưởng khu phố nộp." : "Theo dõi việc được giao, nộp hoàn thành hoặc từ chối khi chưa đánh giá."}
      notice={notice}
      title={isAssigned ? "Giao việc" : "Nhận việc"}
    >
      <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
        <Toolbar keyword={keyword} month={month} year={year} status={status} onKeyword={setKeyword} onMonth={setMonth} onYear={setYear} onStatus={setStatus} onRefresh={loadTasks} />
        <TaskTable isAssigned={isAssigned} tasks={tasks} onDetail={openDetail} />
      </section>
      {openCreate ? <CreateTaskModal options={options} onClose={() => setOpenCreate(false)} onSubmit={handleCreate} /> : null}
      {detail ? <TaskDetailModal isAssigned={isAssigned} task={detail} onClose={() => setDetail(null)} onChanged={loadTasks} setNotice={setNotice} /> : null}
    </PageFrame>
  );
}

function TaskTable({ tasks, isAssigned, onDetail }: { tasks: WardTask[]; isAssigned: boolean; onDetail: (task: WardTask) => void }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-blue-950 text-white">
          <tr>
            <th className="rounded-l-lg px-4 py-3">Tiêu đề</th>
            <th className="px-4 py-3">{isAssigned ? "Người nhận" : "Người giao"}</th>
            <th className="px-4 py-3">Điểm</th>
            <th className="px-4 py-3">Deadline</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Tệp giao</th>
            <th className="px-4 py-3">Tệp nộp</th>
            <th className="rounded-r-lg px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr className="border-b border-slate-100 align-top" key={getId(task.id)}>
              <td className="px-4 py-4">
                <p className="font-bold text-blue-950">{task.title ?? "-"}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{getText(task.content)}</p>
              </td>
              <td className="px-4 py-4">
                {getText(task.assigneeName) ||
                  getText(task.assignerName) ||
                  getText(getRecord(task.assignee).name) ||
                  "-"}
              </td>
              <td className="px-4 py-4 font-bold">{formatNumber(task.points)}</td>
              <td className="px-4 py-4">{formatDate(task.deadline)}</td>
              <td className="px-4 py-4"><StatusBadge status={task.status} /></td>
              <td className="px-4 py-4"><FileList files={task.attachments} /></td>
              <td className="px-4 py-4"><FileList files={task.submissionAttachments} /></td>
              <td className="px-4 py-4 text-right">
                <button className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={() => onDetail(task)} type="button">
                  Chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Chưa có công việc.</p> : null}
    </div>
  );
}

function CreateTaskModal({ options, onClose, onSubmit }: { options: TaskAssignmentOptions; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const heads = headsFromOptions(options);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <form className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-xl" onSubmit={onSubmit}>
        <h2 className="text-lg font-extrabold text-blue-950">Giao việc mới</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input className="h-11 rounded-lg border border-slate-300 px-4 text-sm md:col-span-2" name="title" placeholder="Tiêu đề" required />
          <textarea className="min-h-28 rounded-lg border border-slate-300 px-4 py-3 text-sm md:col-span-2" name="content" placeholder="Nội dung công việc" required />
          <input className="h-11 rounded-lg border border-slate-300 px-4 text-sm" name="points" placeholder="Điểm" required type="number" />
          <input className="h-11 rounded-lg border border-slate-300 px-4 text-sm" name="deadline" required type="datetime-local" />
          <select className="h-11 rounded-lg border border-slate-300 px-4 text-sm" name="assigneeId" required>
            <option value="">Chọn trưởng khu phố</option>
            {heads.map((head) => (
              <option key={getId(head.id)} value={getId(head.id)}>
                {getText(head.name) || getText(head.username) || getId(head.id)}
              </option>
            ))}
          </select>
          <input className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm md:col-span-2" multiple name="files" type="file" />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold" onClick={onClose} type="button">Hủy</button>
          <button className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white" type="submit">Giao việc</button>
        </div>
      </form>
    </div>
  );
}

function TaskDetailModal({ task, isAssigned, onClose, onChanged, setNotice }: { task: WardTask; isAssigned: boolean; onClose: () => void; onChanged: () => Promise<void>; setNotice: (notice: Notice) => void }) {
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const status = getStatus(task.status);
  const canEvaluate = isAssigned && status === "SUBMITTED";
  const canSubmit = !isAssigned && ["ASSIGNED", "SUBMITTED"].includes(status);
  const canReject = !isAssigned && !["COMPLETED", "INCOMPLETE", "REJECTED"].includes(status);

  async function evaluate(statusValue: "COMPLETED" | "INCOMPLETE") {
    if (statusValue === "INCOMPLETE" && !note.trim()) {
      setNotice({ kind: "error", message: "Vui lòng nhập ghi chú khi đánh giá chưa hoàn thành." });
      return;
    }

    try {
      await evaluateWardTask(getId(task.id), { status: statusValue, note: note.trim() || undefined });
      await onChanged();
      onClose();
      setNotice({ kind: "success", message: "Đã đánh giá công việc." });
    } catch (error) {
      setNotice({ kind: "error", message: getError(error, "Không đánh giá được công việc.") });
    }
  }

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await completeWardTask(getId(task.id), new FormData(event.currentTarget));
      await onChanged();
      onClose();
      setNotice({ kind: "success", message: "Đã nộp hoàn thành công việc." });
    } catch (error) {
      setNotice({ kind: "error", message: getError(error, "Không nộp được công việc.") });
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setNotice({ kind: "error", message: "Vui lòng nhập lý do từ chối." });
      return;
    }

    try {
      await rejectWardTask(getId(task.id), { reason: reason.trim() });
      await onChanged();
      onClose();
      setNotice({ kind: "success", message: "Đã từ chối công việc." });
    } catch (error) {
      setNotice({ kind: "error", message: getError(error, "Không từ chối được công việc.") });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-blue-950">{task.title ?? "Chi tiết công việc"}</h2>
            <p className="mt-1 text-sm text-slate-500">Deadline: {formatDate(task.deadline)}</p>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <p className="mt-5 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{getText(task.content) || "-"}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-bold text-blue-950">Tệp giao việc</p>
            <FileList files={task.attachments} />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-blue-950">Tệp nộp việc</p>
            <FileList files={task.submissionAttachments} />
          </div>
        </div>
        {canEvaluate ? (
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú khi đánh giá chưa hoàn thành" value={note} />
            <div className="mt-3 flex flex-wrap justify-end gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700" onClick={() => void evaluate("INCOMPLETE")} type="button">
                <XCircle className="h-4 w-4" />
                Chưa hoàn thành
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white" onClick={() => void evaluate("COMPLETED")} type="button">
                <CheckCircle2 className="h-4 w-4" />
                Hoàn thành
              </button>
            </div>
          </div>
        ) : null}
        {canSubmit ? (
          <form className="mt-5 rounded-xl border border-slate-200 p-4" onSubmit={complete}>
            <p className="mb-3 text-sm font-bold text-blue-950">Nộp hoàn thành</p>
            <input className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm" multiple name="files" type="file" />
            <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white" type="submit">
              <CheckCircle2 className="h-4 w-4" />
              Hoàn thành
            </button>
          </form>
        ) : null}
        {canReject ? (
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <textarea className="min-h-20 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" onChange={(event) => setReason(event.target.value)} placeholder="Lý do từ chối" value={reason} />
            <button className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700" onClick={() => void reject()} type="button">
              Từ chối
            </button>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold" onClick={onClose} type="button">Đóng</button>
        </div>
      </div>
    </div>
  );
}

type DeadlineFilter = "" | "on-time" | "overdue";
type PointSortKey = "name" | "totalTasks" | "completed" | "score";

type TaskScore = {
  earned: number;
  deducted: number;
  net: number;
  isOverdue: boolean;
  deadlineLabel: string;
  latenessText: string;
  submittedAt: unknown;
  evaluatedAt: unknown;
};

type PointReportRow = {
  id: string;
  name: string;
  totalTasks: number;
  assigned: number;
  submitted: number;
  completed: number;
  incomplete: number;
  rejected: number;
  overdue: number;
  earned: number;
  deducted: number;
  score: number;
  raw: PointReport;
  tasks: WardTask[];
};

function getNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function getTaskAssigneeId(task: WardTask) {
  return getId(task.assigneeId) || getId(getRecord(task.assignee).id);
}

function getTaskSubmittedAt(task: WardTask) {
  return task.submittedAt ?? task.completedAt ?? task.submissionTime ?? task.submittedTime;
}

function getTaskEvaluatedAt(task: WardTask) {
  return task.evaluatedAt ?? task.evaluationTime ?? task.reviewedAt ?? task.updatedAt;
}

function getDateMs(value: unknown) {
  const text = getText(value);

  if (!text) return null;

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function formatSigned(value: unknown, mode: "plus" | "minus" | "net" = "net") {
  const number = getNumber(value);
  const prefix = mode === "plus" && number > 0 ? "+" : mode === "minus" && number > 0 ? "-" : number > 0 && mode === "net" ? "+" : "";

  return `${prefix}${formatNumber(Math.abs(number))}`;
}

function getLatenessText(deltaMs: number) {
  const minutes = Math.max(1, Math.ceil(deltaMs / 60000));

  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.ceil(minutes / 60);

  if (hours < 24) return `${hours} giờ`;

  return `${Math.ceil(hours / 24)} ngày`;
}

function calculateTaskScore(task: WardTask, now = Date.now()): TaskScore {
  const status = getStatus(task.status);
  const points = getNumber(task.points);
  const deadlineMs = getDateMs(task.deadline);
  const submittedAt = getTaskSubmittedAt(task);
  const submittedMs = getDateMs(submittedAt);
  const evaluatedAt = getTaskEvaluatedAt(task);
  const completedEarned = status === "COMPLETED" ? points : 0;
  const overdueMs = deadlineMs ? (submittedMs ?? now) - deadlineMs : 0;
  const isLateSubmission = Boolean(deadlineMs && submittedMs && submittedMs > deadlineMs);
  const isMissingPastDeadline = Boolean(deadlineMs && !submittedMs && now > deadlineMs && status !== "COMPLETED");
  const isOverdue = isLateSubmission || isMissingPastDeadline;
  const deducted = isOverdue ? 10 : 0;
  const deadlineLabel = !deadlineMs
    ? "—"
    : isOverdue
      ? "Trễ hạn"
      : submittedMs || status === "COMPLETED"
        ? "Đúng hạn"
        : deadlineMs - now <= 24 * 60 * 60 * 1000
          ? "Sắp đến hạn"
          : "Chưa đến hạn";

  return {
    earned: completedEarned,
    deducted,
    net: completedEarned - deducted,
    isOverdue,
    deadlineLabel,
    latenessText: isOverdue && overdueMs > 0 ? getLatenessText(overdueMs) : "",
    submittedAt,
    evaluatedAt,
  };
}

function getInitialQueryValue(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;

  return new URLSearchParams(window.location.search).get(key) ?? fallback;
}

function isInReportPeriod(value: unknown, month: string, year: string) {
  const dateMs = getDateMs(value);

  if (!dateMs) return true;

  const date = new Date(dateMs);

  return (!month || date.getMonth() + 1 === Number(month))
    && (!year || date.getFullYear() === Number(year));
}

function buildPointRows(
  items: PointReport[],
  tasks: WardTask[],
  month: string,
  year: string,
): PointReportRow[] {
  const periodItems = items.filter((item) => (
    (!month || !item.month || Number(item.month) === Number(month))
    && (!year || !item.year || Number(item.year) === Number(year))
  ));
  const periodTasks = tasks.filter((task) => isInReportPeriod(
    task.deadline ?? task.createdAt ?? task.assignedAt,
    month,
    year,
  ));
  const rows = periodItems.map((item, index) => {
    const id = getId(item.assigneeId) || getId(getRecord(item.user).id) || `row-${index}`;
    const name = getText(item.assigneeName) || getText(item.name) || getText(getRecord(item.user).name) || getText(getRecord(item.user).username) || "—";
    const userTasks = id.startsWith("row-") ? [] : periodTasks.filter((task) => getTaskAssigneeId(task) === id);
    const calculated = userTasks.map((task) => calculateTaskScore(task));
    const countedTotal = getNumber(item.completed) + getNumber(item.incomplete) + getNumber(item.rejected) + getNumber(item.pending) + getNumber(item.submitted);

    return {
      id,
      name,
      totalTasks: countedTotal || getNumber(item.totalTasks) || userTasks.length,
      assigned: getNumber(item.pending),
      submitted: getNumber(item.submitted),
      completed: getNumber(item.completed),
      incomplete: getNumber(item.incomplete),
      rejected: getNumber(item.rejected),
      overdue: calculated.filter((score) => score.isOverdue).length,
      earned: item.earned == null ? calculated.reduce((sum, score) => sum + score.earned, 0) : getNumber(item.earned),
      deducted: item.deducted == null ? calculated.reduce((sum, score) => sum + score.deducted, 0) : getNumber(item.deducted),
      score: item.score == null
        ? calculated.reduce((sum, score) => sum + score.net, 0)
        : getNumber(item.score),
      raw: item,
      tasks: userTasks,
    };
  });

  return Array.from(rows.reduce<Map<string, PointReportRow>>((grouped, row) => {
    const current = grouped.get(row.id);

    if (!current) {
      grouped.set(row.id, row);
      return grouped;
    }

    const tasksById = new Map(
      [...current.tasks, ...row.tasks].map((task, index) => [
        getId(task.id) || `${row.id}-task-${index}`,
        task,
      ]),
    );

    grouped.set(row.id, {
      ...current,
      name: current.name === "—" ? row.name : current.name,
      totalTasks: current.totalTasks + row.totalTasks,
      assigned: current.assigned + row.assigned,
      submitted: current.submitted + row.submitted,
      completed: current.completed + row.completed,
      incomplete: current.incomplete + row.incomplete,
      rejected: current.rejected + row.rejected,
      overdue: Math.max(current.overdue, row.overdue),
      earned: current.earned + row.earned,
      deducted: current.deducted + row.deducted,
      score: current.score + row.score,
      tasks: Array.from(tasksById.values()),
    });

    return grouped;
  }, new Map()).values());
}

function DeadlineBadge({ score }: { score: TaskScore }) {
  const className = score.deadlineLabel === "Trễ hạn"
    ? "border-red-200 bg-red-50 text-red-700"
    : score.deadlineLabel === "Sắp đến hạn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}>{score.deadlineLabel}</span>;
}

function ScoreText({ value }: { value: number }) {
  const className = value < 0 ? "text-red-700" : value > 0 ? "text-emerald-700" : "text-slate-700";

  return <span className={`font-extrabold ${className}`}>{formatSigned(value)}</span>;
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
        <span>{completed}/{total}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-blue-900" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

function PointSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" key={index} />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

export function PointReportPage() {
  const [items, setItems] = useState<PointReport[]>([]);
  const [tasks, setTasks] = useState<WardTask[]>([]);
  const [options, setOptions] = useState<TaskAssignmentOptions>({});
  const [month, setMonth] = useState(() => getInitialQueryValue("month", getCurrentMonthText()));
  const [year, setYear] = useState(() => getInitialQueryValue("year", getCurrentYearText()));
  const [assigneeId, setAssigneeId] = useState(() => getInitialQueryValue("assigneeId", ""));
  const [status, setStatus] = useState(() => getInitialQueryValue("status", ""));
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>(() => getInitialQueryValue("deadline", "") as DeadlineFilter);
  const [keyword, setKeyword] = useState(() => getInitialQueryValue("keyword", ""));
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
  const [selectedId, setSelectedId] = useState("");
  const [sortKey, setSortKey] = useState<PointSortKey>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>({ kind: "info", message: "Đang tải báo cáo điểm..." });
  const role = useMemo(() => getAdminSystemRole(getStoredAdminUser()), []);
  const heads = headsFromOptions(options);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const taskQuery = {
        page: 0,
        size: 1000,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        assigneeId,
        status,
      };
      const [reportData, taskData, optionData] = await Promise.all([
        getPointReport({ month, year, assigneeId }),
        role === "NEIGHBORHOOD_HEAD" ? getReceivedTasks(taskQuery).catch(() => []) : getAssignedTasks(taskQuery).catch(() => []),
        getTaskAssignmentOptions().catch(() => ({})),
      ]);
      setItems(reportData);
      setTasks(taskData);
      setOptions(optionData);
      setLastUpdatedAt(new Date().toLocaleString("vi-VN"));
      setNotice({ kind: "success", message: `Đã tải ${reportData.length} trưởng khu phố.` });
    } catch (error) {
      setItems([]);
      setTasks([]);
      setNotice({ kind: "error", message: getError(error, "Không tải được báo cáo điểm.") });
    } finally {
      setLoading(false);
    }
  }, [month, year, assigneeId, status, role]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedKeyword(keyword), 400);

    return () => window.clearTimeout(timeoutId);
  }, [keyword]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadReport]);

  const rows = useMemo(() => {
    const hasTaskFilter = Boolean(debouncedKeyword.trim() || deadlineFilter || status);
    const normalized = buildPointRows(items, tasks, month, year);
    const filtered = normalized.map((row) => {
      const filteredTasks = row.tasks.filter((task) => {
        const score = calculateTaskScore(task);
        const matchesKeyword = !debouncedKeyword.trim() || `${getText(task.title)} ${getText(task.content)}`.toLowerCase().includes(debouncedKeyword.trim().toLowerCase());
        const matchesDeadline = !deadlineFilter || (deadlineFilter === "overdue" ? score.isOverdue : !score.isOverdue);
        const matchesStatus = !status || getStatus(task.status) === status;

        return matchesKeyword && matchesDeadline && matchesStatus;
      });

      if (!hasTaskFilter || row.tasks.length === 0) {
        return { ...row, tasks: filteredTasks };
      }

      const scores = filteredTasks.map((task) => calculateTaskScore(task));
      const statusCounts = filteredTasks.reduce<{
        assigned: number;
        submitted: number;
        completed: number;
        incomplete: number;
        rejected: number;
      }>(
        (sum, task) => {
          const taskStatus = getStatus(task.status);

          return {
            assigned: sum.assigned + (taskStatus === "ASSIGNED" ? 1 : 0),
            submitted: sum.submitted + (taskStatus === "SUBMITTED" ? 1 : 0),
            completed: sum.completed + (taskStatus === "COMPLETED" ? 1 : 0),
            incomplete: sum.incomplete + (taskStatus === "INCOMPLETE" ? 1 : 0),
            rejected: sum.rejected + (taskStatus === "REJECTED" ? 1 : 0),
          };
        },
        { assigned: 0, submitted: 0, completed: 0, incomplete: 0, rejected: 0 },
      );
      const earned = scores.reduce((sum, score) => sum + score.earned, 0);
      const deducted = scores.reduce((sum, score) => sum + score.deducted, 0);

      return {
        ...row,
        ...statusCounts,
        totalTasks: filteredTasks.length,
        overdue: scores.filter((score) => score.isOverdue).length,
        earned,
        deducted,
        score: earned - deducted,
        tasks: filteredTasks,
      };
    }).filter((row) => (!assigneeId || row.id === assigneeId) && (!hasTaskFilter || row.tasks.length > 0 || tasks.length === 0));

    return filtered.sort((left, right) => {
      const leftValue = sortKey === "name" ? left.name : left[sortKey];
      const rightValue = sortKey === "name" ? right.name : right[sortKey];
      const compared = typeof leftValue === "string"
        ? leftValue.localeCompare(String(rightValue), "vi")
        : Number(leftValue) - Number(rightValue);

      return sortDirection === "asc" ? compared : -compared;
    });
  }, [items, tasks, month, year, debouncedKeyword, deadlineFilter, status, assigneeId, sortKey, sortDirection]);

  const selectedRow = rows.find((row) => row.id === selectedId);
  const totals = rows.reduce(
    (sum, row) => ({
      totalTasks: sum.totalTasks + row.totalTasks,
      completed: sum.completed + row.completed,
      submitted: sum.submitted + row.submitted,
      overdue: sum.overdue + row.overdue,
      earned: sum.earned + row.earned,
      deducted: sum.deducted + row.deducted,
      score: sum.score + row.score,
    }),
    { totalTasks: 0, completed: 0, submitted: 0, overdue: 0, earned: 0, deducted: 0, score: 0 },
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateUrl() {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    [
      ["month", month],
      ["year", year],
      ["assigneeId", assigneeId],
      ["status", status],
      ["deadline", deadlineFilter],
      ["keyword", keyword],
    ].forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
  }

  function applyFilters() {
    updateUrl();
    void loadReport();
  }

  function resetFilters() {
    setMonth(getCurrentMonthText());
    setYear(getCurrentYearText());
    setAssigneeId("");
    setStatus("");
    setDeadlineFilter("");
    setKeyword("");
    setSelectedId("");
    setPage(1);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  function toggleSort(nextKey: PointSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "name" ? "asc" : "desc");
  }

  const metricCards = [
    { label: "Tổng công việc", value: totals.totalTasks, icon: BarChart3, className: "text-blue-900", title: "Tổng số công việc trong kỳ" },
    { label: "Hoàn thành", value: totals.completed, icon: CheckCircle2, className: "text-emerald-700", title: "Công việc đã được duyệt hoàn thành" },
    { label: "Chờ duyệt", value: totals.submitted, icon: Clock, className: "text-amber-700", title: "Công việc đã nộp nhưng chưa duyệt" },
    { label: "Trễ hạn", value: totals.overdue, icon: TimerOff, className: "text-red-700", title: "Công việc nộp trễ hoặc quá hạn chưa nộp" },
    { label: "Điểm cộng", value: `+${formatNumber(totals.earned)}`, icon: TrendingUp, className: "text-emerald-700", title: "Chỉ cộng điểm cho công việc COMPLETED" },
    { label: "Điểm trừ", value: `-${formatNumber(totals.deducted)}`, icon: TrendingDown, className: "text-red-700", title: "Mỗi công việc trễ hạn trừ 10 điểm" },
    { label: "Điểm thực tế", value: formatSigned(totals.score), icon: UserCheck, className: totals.score < 0 ? "text-red-700" : "text-blue-900", title: "Tổng điểm sau khi cộng và trừ" },
  ];

  return (
    <PageFrame
      action={
        <div className="flex flex-col gap-3 sm:items-end">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-3 text-sm font-bold text-blue-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70" disabled={loading} onClick={loadReport} type="button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới dữ liệu
          </button>
          <p className="text-sm text-blue-100">Cập nhật: {lastUpdatedAt || "—"}</p>
        </div>
      }
      description="Theo dõi tiến độ, tình trạng hoàn thành và kết quả KPI"
      notice={notice}
      title={role === "NEIGHBORHOOD_HEAD" ? "Báo cáo điểm của tôi" : "Báo cáo điểm theo nhân viên"}
    >
      <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[120px_120px_minmax(180px,1fr)_190px_160px_minmax(220px,1fr)]">
          <input className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" max="12" min="1" onChange={(event) => { setMonth(event.target.value); setPage(1); }} placeholder="Tháng" type="number" value={month} />
          <input className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" min="2020" onChange={(event) => { setYear(event.target.value); setPage(1); }} placeholder="Năm" type="number" value={year} />
          <select className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" onChange={(event) => setAssigneeId(event.target.value)} value={assigneeId}>
            <option value="">Tất cả trưởng khu phố</option>
            {heads.map((head) => (
              <option key={getId(head.id)} value={getId(head.id)}>
                {getText(head.name) || getText(head.username) || getId(head.id)}
              </option>
            ))}
          </select>
          <select className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" onChange={(event) => setStatus(event.target.value)} value={status}>
            {taskStatuses.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select className="h-11 rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm outline-none focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" onChange={(event) => setDeadlineFilter(event.target.value as DeadlineFilter)} value={deadlineFilter}>
            <option value="">Tất cả thời hạn</option>
            <option value="on-time">Đúng hạn</option>
            <option value="overdue">Trễ hạn</option>
          </select>
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tên công việc" value={keyword} />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:flex lg:justify-end">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={loading} onClick={applyFilters} type="button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Áp dụng
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={resetFilters} type="button">
            <FilterX className="h-4 w-4" />
            Xóa bộ lọc
          </button>
        </div>
      </section>

      {loading ? (
        <PointSkeleton />
      ) : notice.kind === "error" ? (
        <section className="rounded-[20px] border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-700" />
          <p className="mt-3 text-base font-bold text-red-800">Không tải được dữ liệu báo cáo</p>
          <p className="mt-1 text-sm text-red-700">{notice.message}</p>
          <button className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white" onClick={loadReport} type="button">
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        </section>
      ) : rows.length === 0 ? (
        <section className="rounded-[20px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-base font-bold text-blue-950">Chưa có dữ liệu phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">Thử đổi tháng, năm hoặc xóa bộ lọc để xem thêm dữ liệu.</p>
          <button className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700" onClick={resetFilters} type="button">
            <FilterX className="h-4 w-4" />
            Xóa bộ lọc
          </button>
        </section>
      ) : (
        <>
          <section className="grid gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {metricCards.map((metric) => {
              const Icon = metric.icon;

              return (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={metric.label} title={metric.title}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ${metric.className}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-600">{metric.label}</p>
                  <p className={`mt-2 text-2xl font-extrabold ${metric.className}`}>{metric.value}</p>
                </div>
              );
            })}
          </section>

          <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-blue-950">Tổng hợp theo từng nhân viên</h2>
                <p className="mt-1 text-sm text-slate-500">Có thể cuộn ngang bảng trên tablet khi cần.</p>
              </div>
              <p className="text-sm font-semibold text-slate-500">Trang {currentPage}/{pageCount}</p>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="sticky top-0 bg-blue-950 text-white">
                  <tr>
                    {[
                      ["STT", null],
                      ["Trưởng khu phố", "name"],
                      ["Tổng công việc", "totalTasks"],
                      ["Hoàn thành", "completed"],
                      ["Chờ duyệt", null],
                      ["Trễ hạn", null],
                      ["Điểm cộng", null],
                      ["Điểm trừ", null],
                      ["Điểm thực tế", "score"],
                      ["Tiến độ", null],
                      ["Thao tác", null],
                    ].map(([label, key], index, arr) => (
                      <th className={`whitespace-nowrap px-4 py-3 ${index === 0 ? "rounded-l-lg" : ""} ${index === arr.length - 1 ? "rounded-r-lg text-right" : ""}`} key={label}>
                        {key ? (
                          <button className="inline-flex items-center gap-1 font-bold" onClick={() => toggleSort(key as PointSortKey)} type="button">
                            {label}
                            <span aria-hidden="true">{sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                          </button>
                        ) : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row, index) => (
                    <tr className="cursor-pointer border-b border-slate-100 align-middle transition hover:bg-blue-50/50" key={row.id} onClick={() => setSelectedId(row.id)} tabIndex={0}>
                      <td className="px-4 py-4 text-slate-500">{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="sticky left-0 bg-white px-4 py-4 font-bold text-blue-950">{row.name}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-bold">{formatNumber(row.totalTasks)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-emerald-700">{formatNumber(row.completed)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-amber-700">{formatNumber(row.submitted)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-red-700">{formatNumber(row.overdue)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-emerald-700">{formatSigned(row.earned, "plus")}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-red-700">{formatSigned(row.deducted, "minus")}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right"><ScoreText value={row.score} /></td>
                      <td className="px-4 py-4"><ProgressBar completed={row.completed} total={row.totalTasks} /></td>
                      <td className="px-4 py-4 text-right">
                        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }} type="button">
                          <Eye className="h-4 w-4" />
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {pagedRows.map((row) => (
                <button className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm" key={row.id} onClick={() => setSelectedId(row.id)} type="button">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-extrabold text-blue-950">{row.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Tổng việc: {formatNumber(row.totalTasks)}</p>
                    </div>
                    <ScoreText value={row.score} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <span className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700">HT {row.completed}</span>
                    <span className="rounded-lg bg-amber-50 px-3 py-2 font-bold text-amber-700">Chờ {row.submitted}</span>
                    <span className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700">Trễ {row.overdue}</span>
                  </div>
                  <div className="mt-4"><ProgressBar completed={row.completed} total={row.totalTasks} /></div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-bold">
                    <span className="text-emerald-700">{formatSigned(row.earned, "plus")}</span>
                    <span className="text-red-700">{formatSigned(row.deducted, "minus")}</span>
                    <span className={row.score < 0 ? "text-red-700" : "text-blue-900"}>{formatSigned(row.score)}</span>
                  </div>
                  <span className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700">
                    <Eye className="h-4 w-4" />
                    Xem chi tiết
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-50" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Trang trước</button>
              <button className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-50" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">Trang sau</button>
            </div>
          </section>

          {selectedRow ? (
            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-blue-950">Chi tiết công việc: {selectedRow.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">Điểm thực tế mỗi việc = điểm cộng - điểm trừ.</p>
                </div>
                <ProgressBar completed={selectedRow.completed} total={selectedRow.totalTasks} />
              </div>
              {selectedRow.tasks.length === 0 ? (
                <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có danh sách công việc chi tiết từ API hiện tại.</p>
              ) : (
                <>
                  <div className="mt-5 hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[1280px] text-left text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          {["Tên công việc", "Trọng số", "Trạng thái", "Deadline", "Thời gian nộp", "Thời gian đánh giá", "Thời hạn", "Điểm cộng", "Điểm trừ", "Điểm thực tế", "Ghi chú"].map((label) => (
                            <th className="whitespace-nowrap px-4 py-3" key={label}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRow.tasks.map((task) => {
                          const score = calculateTaskScore(task);

                          return (
                            <tr className="border-b border-slate-100 align-top" key={getId(task.id)}>
                              <td className="px-4 py-4">
                                <p className="font-bold text-blue-950">{getText(task.title) || "—"}</p>
                                <p className="mt-1 line-clamp-2 text-slate-500">{getText(task.content) || "—"}</p>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-right font-bold">{formatNumber(task.points)}</td>
                              <td className="px-4 py-4"><StatusBadge status={task.status} /></td>
                              <td className="whitespace-nowrap px-4 py-4">{formatDate(task.deadline)}</td>
                              <td className="whitespace-nowrap px-4 py-4">{formatDate(score.submittedAt)}</td>
                              <td className="whitespace-nowrap px-4 py-4">{formatDate(score.evaluatedAt)}</td>
                              <td className="px-4 py-4">
                                <DeadlineBadge score={score} />
                                {score.latenessText ? <p className="mt-1 text-xs font-semibold text-red-700">Trễ {score.latenessText}</p> : null}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-right text-emerald-700">{formatSigned(score.earned, "plus")}</td>
                              <td className="whitespace-nowrap px-4 py-4 text-right text-red-700">{formatSigned(score.deducted, "minus")}</td>
                              <td className="whitespace-nowrap px-4 py-4 text-right"><ScoreText value={score.net} /></td>
                              <td className="px-4 py-4">{getText(task.note) || getText(task.reason) || getText(task.rejectionReason) || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-5 space-y-3 lg:hidden">
                    {selectedRow.tasks.map((task) => {
                      const score = calculateTaskScore(task);

                      return (
                        <details className="rounded-xl border border-slate-200 p-4" key={getId(task.id)}>
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-extrabold text-blue-950">{getText(task.title) || "—"}</p>
                                <p className="mt-2 text-sm text-slate-600">Deadline: {formatDate(task.deadline)}</p>
                              </div>
                              <ScoreText value={score.net} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <StatusBadge status={task.status} />
                              <DeadlineBadge score={score} />
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Trọng số {formatNumber(task.points)}</span>
                            </div>
                          </summary>
                          <div className="mt-4 space-y-2 text-sm text-slate-700">
                            <p>Nội dung: {getText(task.content) || "—"}</p>
                            <p>Thời gian nộp: {formatDate(score.submittedAt)}</p>
                            <p>Thời gian đánh giá: {formatDate(score.evaluatedAt)}</p>
                            <p>Trễ: {score.latenessText || "—"}</p>
                            <p>Điểm cộng: <span className="font-bold text-emerald-700">{formatSigned(score.earned, "plus")}</span></p>
                            <p>Điểm trừ: <span className="font-bold text-red-700">{formatSigned(score.deducted, "minus")}</span></p>
                            <p>Ghi chú: {getText(task.note) || getText(task.reason) || getText(task.rejectionReason) || "—"}</p>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}
