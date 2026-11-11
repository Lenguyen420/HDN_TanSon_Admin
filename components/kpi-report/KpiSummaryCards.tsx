import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Gauge,
  Users,
  XCircle,
  XOctagon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { KpiStatusCounts } from "@/services/kpi-report";

import { formatNumber } from "./format";

export type KpiSummary = KpiStatusCounts & {
  totalTasks: number;
  employeeCount: number;
  averageScore: number;
};

type Card = {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Chấm màu mang thông tin nhận diện; con số luôn dùng màu chữ mặc định. */
  markClass: string;
  hint: string;
};

export default function KpiSummaryCards({ summary }: { summary: KpiSummary }) {
  const cards: Card[] = [
    {
      label: "Tổng công việc",
      value: formatNumber(summary.totalTasks),
      icon: BarChart3,
      markClass: "bg-blue-50 text-blue-900",
      hint: "Tổng số công việc trong kỳ báo cáo",
    },
    {
      label: "Hoàn thành",
      value: formatNumber(summary.completed),
      icon: CheckCircle2,
      markClass: "bg-emerald-50 text-emerald-700",
      hint: "Được duyệt hoàn thành, cộng điểm",
    },
    {
      label: "Chưa hoàn thành",
      value: formatNumber(summary.incomplete),
      icon: XCircle,
      markClass: "bg-red-50 text-red-700",
      hint: "Bị đánh giá chưa hoàn thành, trừ điểm",
    },
    {
      label: "Chờ đánh giá",
      value: formatNumber(summary.submitted),
      icon: Clock,
      markClass: "bg-blue-50 text-blue-700",
      hint: "Đã nộp, đang chờ chấm điểm",
    },
    {
      label: "Đã giao",
      value: formatNumber(summary.pending),
      icon: ClipboardList,
      markClass: "bg-slate-100 text-slate-700",
      hint: "Đã giao nhưng chưa nộp",
    },
    {
      label: "Từ chối",
      value: formatNumber(summary.rejected),
      icon: XOctagon,
      markClass: "bg-amber-50 text-amber-800",
      hint: "Nhân viên từ chối nhận việc",
    },
    {
      label: "Số nhân viên",
      value: formatNumber(summary.employeeCount),
      icon: Users,
      markClass: "bg-blue-50 text-blue-900",
      hint: "Số nhân viên có dữ liệu trong kỳ",
    },
    {
      label: "Điểm trung bình",
      value: formatNumber(summary.averageScore),
      icon: Gauge,
      markClass: "bg-blue-50 text-blue-900",
      hint: "Trung bình điểm cuối của các nhân viên",
    },
  ];

  return (
    <section aria-label="Số liệu tổng hợp" className="grid gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            key={card.label}
            title={card.hint}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.markClass}`}
              >
                <Icon aria-hidden="true" className="h-4.5 w-4.5" />
              </span>
              <p className="text-sm font-semibold text-slate-600">{card.label}</p>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-blue-950">{card.value}</p>
          </div>
        );
      })}
    </section>
  );
}
