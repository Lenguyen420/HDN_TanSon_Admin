"use client";

import { Eye, Gavel, TriangleAlert } from "lucide-react";
import Link from "next/link";

import type { KpiReportTask } from "@/services/kpi-report";

import TaskStatusBadge from "./TaskStatusBadge";
import { EMPTY_VALUE, formatDateTime, formatNumber, formatSigned, isOverdue } from "./format";

const HEADERS = [
  "Tên việc",
  "Bảng KPI",
  "Deadline",
  "Điểm",
  "Trạng thái",
  "Điểm cộng/trừ",
  "Ngày nộp",
  "Ngày đánh giá",
  "",
];

function OverdueFlag() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
      <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
      Quá hạn chưa nộp
    </span>
  );
}

function PointsDelta({ task }: { task: KpiReportTask }) {
  if (task.earnedPoints === 0 && task.deductedPoints === 0) {
    return <span className="text-slate-400">{EMPTY_VALUE}</span>;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-2 font-bold">
      {task.earnedPoints > 0 ? (
        <span className="text-emerald-700">{formatSigned(task.earnedPoints, "+")}</span>
      ) : null}
      {task.deductedPoints > 0 ? (
        <span className="text-red-700">{formatSigned(task.deductedPoints, "-")}</span>
      ) : null}
    </span>
  );
}

function DetailLink({
  href,
  label = "Xem chi tiết",
  className = "",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  if (!href) {
    return null;
  }

  return (
    <Link
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50 ${className}`}
      href={href}
    >
      <Eye aria-hidden="true" className="h-4 w-4" />
      {label}
    </Link>
  );
}

function EvaluateButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 ${className}`}
      onClick={onClick}
      type="button"
    >
      <Gavel aria-hidden="true" className="h-4 w-4" />
      Chấm điểm
    </button>
  );
}

export default function EmployeeTaskTable({
  tasks,
  buildDetailHref,
  canEvaluate,
  onEvaluate,
}: {
  tasks: KpiReportTask[];
  buildDetailHref: (task: KpiReportTask) => string;
  canEvaluate: boolean;
  onEvaluate: (task: KpiReportTask) => void;
}) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Không có công việc nào khớp bộ lọc trạng thái đang chọn.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              {HEADERS.map((header, index) => (
                <th
                  className={`whitespace-nowrap px-3 py-2 font-bold ${
                    index === HEADERS.length - 1 ? "text-right" : ""
                  }`}
                  key={header || "actions"}
                  scope="col"
                >
                  {header || <span className="sr-only">Thao tác</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const overdue = isOverdue(task);

              return (
                <tr
                  className={`border-b border-slate-100 align-top ${
                    overdue ? "bg-red-50/40" : ""
                  }`}
                  key={task.id}
                >
                  <td className="max-w-[280px] px-3 py-3">
                    <p className="font-bold text-blue-950">{task.title ?? EMPTY_VALUE}</p>
                    {overdue ? <OverdueFlag /> : null}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {task.board?.title ?? EMPTY_VALUE}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 ${overdue ? "font-bold text-red-700" : "text-slate-600"}`}>
                    {formatDateTime(task.deadline)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-800">
                    {formatNumber(task.points)}
                  </td>
                  <td className="px-3 py-3">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <PointsDelta task={task} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {formatDateTime(task.submittedAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {formatDateTime(task.evaluatedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-end gap-2">
                      <DetailLink href={buildDetailHref(task)} />
                      {canEvaluate && task.status === "SUBMITTED" ? (
                        <EvaluateButton onClick={() => onEvaluate(task)} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {tasks.map((task) => {
          const overdue = isOverdue(task);

          return (
            <li
              className={`rounded-xl border p-4 ${
                overdue ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"
              }`}
              key={task.id}
            >
              <p className="text-sm font-extrabold text-blue-950">
                {task.title ?? EMPTY_VALUE}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  {formatNumber(task.points)} điểm
                </span>
                <PointsDelta task={task} />
              </div>
              {overdue ? <OverdueFlag /> : null}
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="font-semibold text-slate-500">Bảng KPI</dt>
                  <dd className="text-slate-700">{task.board?.title ?? EMPTY_VALUE}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Deadline</dt>
                  <dd className={overdue ? "font-bold text-red-700" : "text-slate-700"}>
                    {formatDateTime(task.deadline)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Ngày nộp</dt>
                  <dd className="text-slate-700">{formatDateTime(task.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Ngày đánh giá</dt>
                  <dd className="text-slate-700">{formatDateTime(task.evaluatedAt)}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <DetailLink className="flex-1" href={buildDetailHref(task)} />
                {canEvaluate && task.status === "SUBMITTED" ? (
                  <EvaluateButton className="flex-1" onClick={() => onEvaluate(task)} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
