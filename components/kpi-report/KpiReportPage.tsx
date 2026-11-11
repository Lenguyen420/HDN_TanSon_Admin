"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";

import {
  TASK_STATUSES,
  type KpiReportTask,
  type KpiReportUserGroup,
  type TaskStatus,
} from "@/services/kpi-report";
import { getAdminSystemRole, getStoredAdminUser } from "@/services/auth.service";

import EmployeeGroupList, {
  sortGroups,
  type GroupSortKey,
} from "./EmployeeGroupList";
import EvaluateTaskDialog from "./EvaluateTaskDialog";
import KpiFilterBar, { type EmployeeOption } from "./KpiFilterBar";
import KpiSummaryCards, { type KpiSummary } from "./KpiSummaryCards";
import { EmptyState, ErrorState, KpiSkeleton } from "./StateBlocks";
import { exportSummaryWorkbook } from "./excel";
import { formatDateTime, getUserDisplayName } from "./format";
import { invalidateKpiCaches, useAssignmentOptions, useKpiReport } from "./useKpiReport";

export const REPORT_BASE_PATH = "/admin/point-report";

export function readMonthParam(params: ReadonlyURLSearchParams): number {
  const parsed = Number(params.get("month"));

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed
    : new Date().getMonth() + 1;
}

export function readYearParam(params: ReadonlyURLSearchParams): number {
  const parsed = Number(params.get("year"));

  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2999
    ? parsed
    : new Date().getFullYear();
}

function readStatuses(params: ReadonlyURLSearchParams): TaskStatus[] {
  return (params.get("status") ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is TaskStatus => (TASK_STATUSES as string[]).includes(value));
}

function readSort(params: ReadonlyURLSearchParams): GroupSortKey {
  const value = params.get("sort");

  return value === "score" || value === "incomplete" ? value : "name";
}

function groupKey(group: KpiReportUserGroup, index: number): string {
  return group.user?.id ?? `group-${index}`;
}

export default function KpiReportPage() {
  // Đọc bộ lọc từ query string qua router: route được render phía client dưới
  // ranh giới <Suspense> nên không lệch nội dung giữa server và client.
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => readMonthParam(searchParams));
  const [year, setYear] = useState(() => readYearParam(searchParams));
  const [assigneeId, setAssigneeId] = useState(
    () => searchParams.get("assigneeId") ?? "",
  );
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") ?? "");
  const [statuses, setStatuses] = useState<TaskStatus[]>(() =>
    readStatuses(searchParams),
  );
  const [sortKey, setSortKey] = useState<GroupSortKey>(() => readSort(searchParams));
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [evaluatingTask, setEvaluatingTask] = useState<KpiReportTask | null>(null);

  const report = useKpiReport({ month, year, assigneeId });
  const options = useAssignmentOptions();
  const role = useMemo(() => getAdminSystemRole(getStoredAdminUser()), []);
  const canEvaluate = role === "ADMIN" || role === "WARD_CHAIRMAN";

  useEffect(() => {
    const params = new URLSearchParams();

    params.set("month", String(month));
    params.set("year", String(year));

    if (assigneeId) params.set("assigneeId", assigneeId);
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (statuses.length > 0) params.set("status", statuses.join(","));
    if (sortKey !== "name") params.set("sort", sortKey);

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [assigneeId, keyword, month, sortKey, statuses, year]);

  const employees: EmployeeOption[] = useMemo(() => {
    const merged = new Map<string, EmployeeOption>();

    (options?.neighborhoodHeads ?? []).forEach((head) => {
      if (head.id) {
        merged.set(head.id, {
          id: head.id,
          label: head.name ?? head.username ?? head.id,
        });
      }
    });
    (report.data?.users ?? []).forEach((group) => {
      const id = group.user?.id;

      if (id && !merged.has(id)) {
        merged.set(id, { id, label: getUserDisplayName(group.user) });
      }
    });

    return [...merged.values()].sort((left, right) =>
      left.label.localeCompare(right.label, "vi"),
    );
  }, [options, report.data]);

  const filteredGroups = useMemo(() => {
    const users = report.data?.users ?? [];
    const search = keyword.trim().toLowerCase();
    const matched = search
      ? users.filter((group) => {
          const name = group.user?.name ?? "";
          const username = group.user?.username ?? "";

          return `${name} ${username}`.toLowerCase().includes(search);
        })
      : users;

    return sortGroups(matched, sortKey);
  }, [keyword, report.data, sortKey]);

  const summary: KpiSummary | null = useMemo(() => {
    if (!report.data) {
      return null;
    }

    const scoreTotal = filteredGroups.reduce((total, group) => total + group.score, 0);
    const averageScore =
      filteredGroups.length > 0
        ? Math.round((scoreTotal / filteredGroups.length) * 10) / 10
        : 0;
    const isFiltered = filteredGroups.length !== report.data.users.length;

    // Không có bộ lọc phía client thì dùng thẳng `summary` của backend.
    if (!isFiltered) {
      return {
        ...report.data.summary,
        totalTasks: report.data.totalTasks,
        employeeCount: report.data.users.length,
        averageScore,
      };
    }

    return filteredGroups.reduce<KpiSummary>(
      (total, group) => ({
        completed: total.completed + group.completed,
        incomplete: total.incomplete + group.incomplete,
        rejected: total.rejected + group.rejected,
        pending: total.pending + group.pending,
        submitted: total.submitted + group.submitted,
        totalTasks: total.totalTasks + group.totalTasks,
        employeeCount: filteredGroups.length,
        averageScore,
      }),
      {
        completed: 0,
        incomplete: 0,
        rejected: 0,
        pending: 0,
        submitted: 0,
        totalTasks: 0,
        employeeCount: filteredGroups.length,
        averageScore,
      },
    );
  }, [filteredGroups, report.data]);

  const getVisibleTasks = useCallback(
    (group: KpiReportUserGroup) =>
      statuses.length === 0
        ? group.tasks
        : group.tasks.filter((task) => statuses.includes(task.status)),
    [statuses],
  );

  const buildDetailHref = useCallback(
    (group: KpiReportUserGroup) =>
      group.user?.id
        ? `${REPORT_BASE_PATH}/${group.user.id}?month=${month}&year=${year}`
        : "",
    [month, year],
  );

  const buildTaskHref = useCallback(
    (group: KpiReportUserGroup, task: KpiReportTask) => {
      const base = buildDetailHref(group);

      return base ? `${base}&task=${encodeURIComponent(task.id)}` : "";
    },
    [buildDetailHref],
  );

  function toggleGroup(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleStatus(status: TaskStatus) {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  }

  function resetToCurrentMonth() {
    const now = new Date();

    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  }

  function handleExport() {
    if (report.data) {
      exportSummaryWorkbook(report.data, filteredGroups);
    }
  }

  function handleEvaluated() {
    setEvaluatingTask(null);
    invalidateKpiCaches();
    report.refetch();
  }

  const headingTitle =
    role === "NEIGHBORHOOD_HEAD" ? "Báo cáo điểm của tôi" : "Báo cáo điểm KPI";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-blue-900/10 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />
        <div className="flex flex-col gap-3 bg-blue-950 p-6 text-white lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
              Giao việc khu phố
            </p>
            <h1 className="mt-2 text-2xl font-extrabold">{headingTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
              Công việc được nhóm theo nhân viên. Điểm cuối = {report.data?.initialPoints ?? 100}{" "}
              điểm khởi tạo + điểm cộng − điểm trừ, lấy trực tiếp từ hệ thống chấm điểm.
            </p>
          </div>
          <p className="text-sm text-blue-100">
            {report.isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Đang tải dữ liệu…
              </span>
            ) : report.fetchedAt ? (
              `Cập nhật: ${formatDateTime(new Date(report.fetchedAt).toISOString())}`
            ) : null}
          </p>
        </div>
      </section>

      <KpiFilterBar
        assigneeId={assigneeId}
        canExport={Boolean(report.data && filteredGroups.length > 0)}
        employees={employees}
        isFetching={report.isFetching}
        keyword={keyword}
        month={month}
        onAssigneeChange={setAssigneeId}
        onCurrentMonth={resetToCurrentMonth}
        onExport={handleExport}
        onKeywordChange={setKeyword}
        onMonthChange={setMonth}
        onRefresh={report.refetch}
        onResetStatuses={() => setStatuses([])}
        onToggleStatus={toggleStatus}
        onYearChange={setYear}
        statuses={statuses}
        year={year}
      />

      {report.isLoading ? (
        <KpiSkeleton />
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

          {summary ? <KpiSummaryCards summary={summary} /> : null}

          {report.data.users.length === 0 ? (
            <EmptyState
              description={`Không có công việc nào được ghi nhận trong tháng ${month}/${year}.`}
              title="Chưa có dữ liệu tháng này"
            />
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              action={
                <button
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setKeyword("")}
                  type="button"
                >
                  Xoá từ khoá tìm kiếm
                </button>
              }
              description={`Không tìm thấy nhân viên nào khớp với “${keyword.trim()}”.`}
              title="Không có nhân viên phù hợp"
            />
          ) : (
            <EmployeeGroupList
              buildDetailHref={buildDetailHref}
              buildTaskHref={buildTaskHref}
              canEvaluate={canEvaluate}
              getVisibleTasks={getVisibleTasks}
              groups={filteredGroups}
              onCollapseAll={() => setOpenIds(new Set())}
              onEvaluate={setEvaluatingTask}
              onOpenAll={() =>
                setOpenIds(new Set(filteredGroups.map((group, index) => groupKey(group, index))))
              }
              onSortChange={setSortKey}
              onToggle={toggleGroup}
              openIds={openIds}
              sortKey={sortKey}
            />
          )}
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
