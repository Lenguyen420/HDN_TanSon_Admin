"use client";

import { CalendarClock, FileDown, Loader2, RefreshCw, Search } from "lucide-react";

import type { TaskStatus } from "@/services/kpi-report";

import {
  STATUS_DISPLAY_ORDER,
  STATUS_META,
  getMonthOptions,
  getYearOptions,
} from "./format";

export type EmployeeOption = {
  id: string;
  label: string;
};

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100";

export default function KpiFilterBar({
  month,
  year,
  assigneeId,
  keyword,
  statuses,
  employees,
  isFetching,
  canExport,
  onMonthChange,
  onYearChange,
  onAssigneeChange,
  onKeywordChange,
  onToggleStatus,
  onResetStatuses,
  onCurrentMonth,
  onRefresh,
  onExport,
}: {
  month: number;
  year: number;
  assigneeId: string;
  keyword: string;
  statuses: TaskStatus[];
  employees: EmployeeOption[];
  isFetching: boolean;
  canExport: boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onAssigneeChange: (assigneeId: string) => void;
  onKeywordChange: (keyword: string) => void;
  onToggleStatus: (status: TaskStatus) => void;
  onResetStatuses: () => void;
  onCurrentMonth: () => void;
  onRefresh: () => void;
  onExport: () => void;
}) {
  return (
    <section className="sticky top-0 z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:mx-0 sm:rounded-[20px] sm:border sm:px-5">
      <h2 className="sr-only">Bộ lọc báo cáo điểm</h2>
      <div className="grid gap-3 lg:grid-cols-[140px_120px_minmax(200px,1fr)_minmax(200px,1fr)_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Tháng
          </span>
          <select
            className={inputClass}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            value={month}
          >
            {getMonthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Năm
          </span>
          <select
            className={inputClass}
            onChange={(event) => onYearChange(Number(event.target.value))}
            value={year}
          >
            {getYearOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Nhân viên
          </span>
          <select
            className={inputClass}
            onChange={(event) => onAssigneeChange(event.target.value)}
            value={assigneeId}
          >
            <option value="">Tất cả nhân viên</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Tìm theo tên
          </span>
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className={`${inputClass} pl-9`}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Tên nhân viên"
              type="search"
              value={keyword}
            />
          </span>
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={onCurrentMonth}
            type="button"
          >
            <CalendarClock aria-hidden="true" className="h-4 w-4" />
            Tháng này
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFetching}
            onClick={onRefresh}
            type="button"
          >
            {isFetching ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            )}
            Làm mới
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canExport}
            onClick={onExport}
            type="button"
          >
            <FileDown aria-hidden="true" className="h-4 w-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      <fieldset className="mt-3 flex flex-wrap items-center gap-2">
        <legend className="sr-only">Lọc theo trạng thái công việc</legend>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Trạng thái
        </span>
        {STATUS_DISPLAY_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const active = statuses.includes(status);

          return (
            <button
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? meta.badgeClass
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
              key={status}
              onClick={() => onToggleStatus(status)}
              type="button"
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
              {meta.label}
            </button>
          );
        })}
        {statuses.length > 0 ? (
          <button
            className="rounded-full px-2 py-1 text-xs font-bold text-blue-700 underline underline-offset-2 transition hover:text-blue-900"
            onClick={onResetStatuses}
            type="button"
          >
            Bỏ lọc trạng thái
          </button>
        ) : null}
      </fieldset>
      <p className="mt-2 text-xs text-slate-500">
        Lọc trạng thái chỉ ẩn/hiện công việc trong bảng, không làm thay đổi số liệu
        thống kê của từng nhân viên.
      </p>
    </section>
  );
}
