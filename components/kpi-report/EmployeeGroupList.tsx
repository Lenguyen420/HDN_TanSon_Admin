"use client";

import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import type { KpiReportTask, KpiReportUserGroup } from "@/services/kpi-report";

import EmployeeGroupCard from "./EmployeeGroupCard";

export type GroupSortKey = "name" | "score" | "incomplete";

export const GROUP_SORT_OPTIONS: Array<{ value: GroupSortKey; label: string }> = [
  { value: "name", label: "Theo tên (mặc định)" },
  { value: "score", label: "Điểm giảm dần" },
  { value: "incomplete", label: "Việc chưa hoàn thành giảm dần" },
];

/**
 * Backend đã sắp `users` theo tên tiếng Việt nên "theo tên" giữ nguyên thứ tự gốc.
 * Các kiểu sắp xếp khác dùng `sort` ổn định của JS để giữ thứ tự tên khi bằng điểm.
 */
export function sortGroups(
  groups: KpiReportUserGroup[],
  sortKey: GroupSortKey,
): KpiReportUserGroup[] {
  if (sortKey === "name") {
    return groups;
  }

  return [...groups].sort((left, right) =>
    sortKey === "score"
      ? right.score - left.score
      : right.incomplete - left.incomplete,
  );
}

export default function EmployeeGroupList({
  groups,
  getVisibleTasks,
  openIds,
  sortKey,
  onSortChange,
  onToggle,
  onOpenAll,
  onCollapseAll,
  buildDetailHref,
  buildTaskHref,
  canEvaluate,
  onEvaluate,
}: {
  groups: KpiReportUserGroup[];
  getVisibleTasks: (group: KpiReportUserGroup) => KpiReportTask[];
  openIds: Set<string>;
  sortKey: GroupSortKey;
  onSortChange: (sortKey: GroupSortKey) => void;
  onToggle: (id: string) => void;
  onOpenAll: () => void;
  onCollapseAll: () => void;
  buildDetailHref: (group: KpiReportUserGroup) => string;
  buildTaskHref: (group: KpiReportUserGroup, task: KpiReportTask) => string;
  canEvaluate: boolean;
  onEvaluate: (task: KpiReportTask) => void;
}) {
  const allOpen = groups.length > 0 && groups.every((group, index) => openIds.has(group.user?.id ?? `group-${index}`));

  return (
    <section aria-label="Danh sách nhân viên" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-extrabold text-blue-950">
          Công việc theo nhân viên
          <span className="ml-2 text-sm font-semibold text-slate-500">
            ({groups.length} nhân viên)
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Sắp xếp
            <select
              className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => onSortChange(event.target.value as GroupSortKey)}
              value={sortKey}
            >
              {GROUP_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={allOpen ? onCollapseAll : onOpenAll}
            type="button"
          >
            {allOpen ? (
              <ChevronsDownUp aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ChevronsUpDown aria-hidden="true" className="h-4 w-4" />
            )}
            {allOpen ? "Thu gọn tất cả" : "Mở tất cả"}
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {groups.map((group, index) => {
          const id = group.user?.id ?? `group-${index}`;

          return (
            <EmployeeGroupCard
              buildTaskHref={(task) => buildTaskHref(group, task)}
              canEvaluate={canEvaluate}
              detailHref={buildDetailHref(group)}
              group={group}
              isOpen={openIds.has(id)}
              key={id}
              onEvaluate={onEvaluate}
              onToggle={() => onToggle(id)}
              visibleTasks={getVisibleTasks(group)}
            />
          );
        })}
      </ul>
    </section>
  );
}
