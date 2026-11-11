"use client";

import { ChevronDown, Eye } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import type { KpiReportTask, KpiReportUserGroup } from "@/services/kpi-report";

import EmployeeTaskTable from "./EmployeeTaskTable";
import {
  STATUS_DISPLAY_ORDER,
  STATUS_META,
  formatNumber,
  formatSigned,
  getCompletionPercent,
  getInitials,
  getRoleLabel,
  getStatusCount,
  getUserDisplayName,
} from "./format";

export function ScorePill({ score, className = "" }: { score: number; className?: string }) {
  const good = score >= 100;

  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-lg px-3 py-1.5 text-2xl font-extrabold tabular-nums ${
        good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      } ${className}`}
    >
      {formatNumber(score)}
      <span className="text-xs font-bold uppercase tracking-wide">điểm</span>
    </span>
  );
}

export function CompletionBar({
  completed,
  total,
  className = "",
}: {
  completed: number;
  total: number;
  className?: string;
}) {
  const percent = getCompletionPercent(completed, total);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
        <span>
          Hoàn thành {formatNumber(completed)}/{formatNumber(total)}
        </span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div
        aria-label="Tiến độ hoàn thành"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

export default function EmployeeGroupCard({
  group,
  visibleTasks,
  isOpen,
  onToggle,
  detailHref,
  buildTaskHref,
  canEvaluate,
  onEvaluate,
}: {
  group: KpiReportUserGroup;
  visibleTasks: KpiReportTask[];
  isOpen: boolean;
  onToggle: () => void;
  detailHref: string;
  buildTaskHref: (task: KpiReportTask) => string;
  canEvaluate: boolean;
  onEvaluate: (task: KpiReportTask) => void;
}) {
  const panelId = useId();
  const name = getUserDisplayName(group.user);
  const avatar = group.user?.avatar ?? null;

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative">
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl transition hover:bg-blue-50/40"
          onClick={onToggle}
          type="button"
        >
          <span className="sr-only">
            {isOpen ? "Thu gọn" : "Mở"} danh sách công việc của {name}
          </span>
        </button>

        {/* `relative` để nội dung vẽ đè lên nền hover của nút phủ phía sau. */}
        <div className="pointer-events-none relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
          <ChevronDown
            aria-hidden="true"
            className={`hidden h-5 w-5 shrink-0 text-slate-400 transition-transform sm:block ${
              isOpen ? "rotate-180" : ""
            }`}
          />

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-extrabold text-blue-900">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="h-full w-full object-cover" src={avatar} />
              ) : (
                getInitials(name)
              )}
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {detailHref ? (
                  <Link
                    className="pointer-events-auto relative z-10 truncate text-base font-extrabold text-blue-950 underline-offset-4 hover:underline"
                    href={detailHref}
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="truncate text-base font-extrabold text-blue-950">
                    {name}
                  </span>
                )}
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800">
                  {getRoleLabel(group.user?.role)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {formatNumber(group.totalTasks)} công việc
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {STATUS_DISPLAY_ORDER.map((status) => {
                  const count = getStatusCount(group, status);

                  if (count === 0) {
                    return null;
                  }

                  const meta = STATUS_META[status];

                  return (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${meta.badgeClass}`}
                      key={status}
                    >
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                      {meta.label} {formatNumber(count)}
                    </span>
                  );
                })}
                {group.totalTasks === 0 ? (
                  <span className="text-xs text-slate-400">Chưa có công việc</span>
                ) : null}
              </div>

              <CompletionBar
                className="mt-3 max-w-xs"
                completed={group.completed}
                total={group.totalTasks}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <div className="text-right">
              <ScorePill score={group.score} />
              <p className="mt-1 text-xs font-bold">
                <span className="text-emerald-700">{formatSigned(group.earned, "+")}</span>
                <span className="mx-1 text-slate-300">/</span>
                <span className="text-red-700">{formatSigned(group.deducted, "-")}</span>
              </p>
            </div>
            {detailHref ? (
              <Link
                className="pointer-events-auto relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                href={detailHref}
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
                Xem chi tiết
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 p-4" hidden={!isOpen} id={panelId}>
        {group.tasks.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Nhân viên này chưa được giao công việc nào trong kỳ.
          </p>
        ) : (
          <EmployeeTaskTable
            buildDetailHref={buildTaskHref}
            canEvaluate={canEvaluate}
            onEvaluate={onEvaluate}
            tasks={visibleTasks}
          />
        )}
      </div>
    </li>
  );
}
