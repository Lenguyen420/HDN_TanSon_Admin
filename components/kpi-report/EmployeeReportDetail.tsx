"use client";

import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  FileDown,
  Gavel,
  Loader2,
  Phone,
  RefreshCw,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { KpiReportTask } from "@/services/kpi-report";
import { getAdminSystemRole, getStoredAdminUser } from "@/services/auth.service";

import AttachmentList from "./AttachmentList";
import { CompletionBar } from "./EmployeeGroupCard";
import EvaluateTaskDialog from "./EvaluateTaskDialog";
import { REPORT_BASE_PATH, readMonthParam, readYearParam } from "./KpiReportPage";
import ScoreBreakdown from "./ScoreBreakdown";
import { EmptyState, ErrorState, KpiSkeleton } from "./StateBlocks";
import StatusDistributionChart from "./StatusDistributionChart";
import TaskStatusBadge from "./TaskStatusBadge";
import { exportEmployeeWorkbook } from "./excel";
import {
  EMPTY_VALUE,
  formatDateTime,
  formatNumber,
  formatSigned,
  getInitials,
  getMonthOptions,
  getRoleLabel,
  getUserDisplayName,
  getYearOptions,
  isOverdue,
} from "./format";
import { invalidateKpiCaches, useEmployeeKpiReport } from "./useKpiReport";

const selectClass =
  "h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

function NoteCallout({
  tone,
  label,
  children,
}: {
  tone: "amber" | "red";
  label: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-red-300 bg-red-50 text-red-900";

  return (
    <div className={`rounded-xl border-l-4 px-3 py-2 ${toneClass}`}>
      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
        <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

function TaskCard({
  task,
  isOpen,
  onToggle,
  canEvaluate,
  onEvaluate,
}: {
  task: KpiReportTask;
  isOpen: boolean;
  onToggle: () => void;
  canEvaluate: boolean;
  onEvaluate: () => void;
}) {
  const panelId = `task-panel-${task.id}`;
  const overdue = isOverdue(task);

  return (
    <li
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        overdue ? "border-red-200" : "border-slate-200"
      }`}
      id={`task-${task.id}`}
    >
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-blue-50/40"
        onClick={onToggle}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-blue-950">
            {task.title ?? EMPTY_VALUE}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {formatNumber(task.points)} điểm
            </span>
            {task.board?.title ? (
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {task.board.title}
              </span>
            ) : null}
            <span
              className={`text-xs font-semibold ${
                overdue ? "font-bold text-red-700" : "text-slate-500"
              }`}
            >
              Hạn: {formatDateTime(task.deadline)}
              {overdue ? " · Quá hạn" : ""}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-right text-xs font-bold">
          {task.earnedPoints > 0 ? (
            <span className="block text-emerald-700">
              {formatSigned(task.earnedPoints, "+")}
            </span>
          ) : null}
          {task.deductedPoints > 0 ? (
            <span className="block text-red-700">
              {formatSigned(task.deductedPoints, "-")}
            </span>
          ) : null}
          {task.earnedPoints === 0 && task.deductedPoints === 0 ? (
            <span className="block text-slate-400">{EMPTY_VALUE}</span>
          ) : null}
        </span>
      </button>

      <div className="border-t border-slate-100 p-4" hidden={!isOpen} id={panelId}>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Người giao
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {getUserDisplayName(task.chairman)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Ngày nộp
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDateTime(task.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Ngày đánh giá
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDateTime(task.evaluatedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Ngày tạo
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDateTime(task.createdAt)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
            {task.content ?? EMPTY_VALUE}
          </p>
        </div>

        {task.rejectionReason || task.incompleteNote ? (
          <div className="mt-4 space-y-2">
            {task.rejectionReason ? (
              <NoteCallout label="Lý do từ chối nhận việc" tone="amber">
                {task.rejectionReason}
              </NoteCallout>
            ) : null}
            {task.incompleteNote ? (
              <NoteCallout label="Ghi chú chưa hoàn thành" tone="red">
                {task.incompleteNote}
              </NoteCallout>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AttachmentList attachments={task.attachments} title="Tệp lúc giao việc" />
          <AttachmentList
            attachments={task.submissionAttachments}
            emptyLabel="Chưa có minh chứng"
            title="Minh chứng khi hoàn thành"
          />
        </div>

        {canEvaluate && task.status === "SUBMITTED" ? (
          <button
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
            onClick={onEvaluate}
            type="button"
          >
            <Gavel aria-hidden="true" className="h-4 w-4" />
            Chấm điểm công việc này
          </button>
        ) : null}
      </div>
    </li>
  );
}

export default function EmployeeReportDetail({ assigneeId }: { assigneeId: string }) {
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => readMonthParam(searchParams));
  const [year, setYear] = useState(() => readYearParam(searchParams));
  const [evaluatingTask, setEvaluatingTask] = useState<KpiReportTask | null>(null);
  const [focusTaskId] = useState(() => searchParams.get("task") ?? "");
  // Việc đến từ `?task=` được mở sẵn ngay từ lần render đầu.
  const [openTaskIds, setOpenTaskIds] = useState<Set<string>>(() =>
    focusTaskId ? new Set([focusTaskId]) : new Set(),
  );

  const report = useEmployeeKpiReport(assigneeId, { month, year });
  const role = useMemo(() => getAdminSystemRole(getStoredAdminUser()), []);
  const canEvaluate = role === "ADMIN" || role === "WARD_CHAIRMAN";

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?month=${month}&year=${year}`,
    );
  }, [month, year]);

  useEffect(() => {
    if (!focusTaskId || !report.data) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      document
        .getElementById(`task-${focusTaskId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [focusTaskId, report.data]);

  const backHref = `${REPORT_BASE_PATH}?month=${month}&year=${year}`;
  const name = getUserDisplayName(report.data?.user ?? null);
  const avatar = report.data?.user?.avatar ?? null;

  function toggleTask(id: string) {
    setOpenTaskIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function handleEvaluated() {
    setEvaluatingTask(null);
    invalidateKpiCaches();
    report.refetch();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Quay lại báo cáo tổng hợp
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="detail-month">
            Tháng
          </label>
          <select
            className={selectClass}
            id="detail-month"
            onChange={(event) => setMonth(Number(event.target.value))}
            value={month}
          >
            {getMonthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="detail-year">
            Năm
          </label>
          <select
            className={selectClass}
            id="detail-year"
            onChange={(event) => setYear(Number(event.target.value))}
            value={year}
          >
            {getYearOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              const now = new Date();

              setMonth(now.getMonth() + 1);
              setYear(now.getFullYear());
            }}
            type="button"
          >
            <CalendarClock aria-hidden="true" className="h-4 w-4" />
            Tháng này
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={report.isFetching}
            onClick={report.refetch}
            type="button"
          >
            {report.isFetching ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            )}
            Làm mới
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-900 px-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!report.data}
            onClick={() => report.data && exportEmployeeWorkbook(report.data)}
            type="button"
          >
            <FileDown aria-hidden="true" className="h-4 w-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {report.isLoading ? (
        <KpiSkeleton groups={3} />
      ) : report.error && !report.data ? (
        <ErrorState message={report.error} onRetry={report.refetch} />
      ) : report.data ? (
        <>
          {report.error ? (
            <p
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
              role="alert"
            >
              {report.error} Đang hiển thị dữ liệu đã tải trước đó.
            </p>
          ) : null}

          <section className="overflow-hidden rounded-[24px] border border-blue-900/10 bg-white shadow-sm">
            <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />
            <div className="flex flex-col gap-4 bg-blue-950 p-6 text-white sm:flex-row sm:items-center">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-lg font-extrabold text-blue-900">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-full w-full object-cover" src={avatar} />
                ) : (
                  getInitials(name)
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
                  Báo cáo điểm tháng {report.data.month}/{report.data.year}
                </p>
                <h1 className="mt-1 truncate text-2xl font-extrabold">{name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-100">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound aria-hidden="true" className="h-4 w-4" />
                    {getRoleLabel(report.data.user?.role)}
                    {report.data.user?.username ? ` · ${report.data.user.username}` : ""}
                  </span>
                  {report.data.user?.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone aria-hidden="true" className="h-4 w-4" />
                      {report.data.user.phone}
                    </span>
                  ) : null}
                </div>
              </div>
              <CompletionBar
                className="w-full max-w-xs rounded-xl bg-white/10 p-3 sm:ml-auto [&_span]:text-blue-50"
                completed={report.data.completed}
                total={report.data.totalTasks}
              />
            </div>
          </section>

          <ScoreBreakdown
            deducted={report.data.deducted}
            earned={report.data.earned}
            initialPoints={report.data.initialPoints}
            score={report.data.score}
          />

          <StatusDistributionChart counts={report.data} total={report.data.totalTasks} />

          <section aria-label="Danh sách công việc" className="space-y-3">
            <h2 className="text-lg font-extrabold text-blue-950">
              Chi tiết công việc
              <span className="ml-2 text-sm font-semibold text-slate-500">
                ({formatNumber(report.data.tasks.length)} công việc)
              </span>
            </h2>

            {report.data.tasks.length === 0 ? (
              <EmptyState
                description={`Nhân viên này chưa có công việc nào trong tháng ${month}/${year}.`}
                title="Chưa có dữ liệu tháng này"
              />
            ) : (
              <ul className="space-y-3">
                {report.data.tasks.map((task) => (
                  <TaskCard
                    canEvaluate={canEvaluate}
                    isOpen={openTaskIds.has(task.id)}
                    key={task.id}
                    onEvaluate={() => setEvaluatingTask(task)}
                    onToggle={() => toggleTask(task.id)}
                    task={task}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {evaluatingTask ? (
        <EvaluateTaskDialog
          onClose={() => setEvaluatingTask(null)}
          onEvaluated={handleEvaluated}
          task={evaluatingTask}
        />
      ) : null}
    </div>
  );
}
