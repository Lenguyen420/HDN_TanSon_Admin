import type { KpiStatusCounts } from "@/services/kpi-report";

import { STATUS_DISPLAY_ORDER, STATUS_META, formatNumber, getStatusCount } from "./format";

/**
 * Phân bổ trạng thái là quan hệ phần / tổng nên dùng thanh xếp chồng nằm ngang
 * (nhãn tiếng Việt dài, đọc theo hàng dễ hơn hình tròn).
 * Mỗi phần luôn kèm nhãn chữ + số, không phân biệt bằng màu.
 */
export default function StatusDistributionChart({
  counts,
  total,
}: {
  counts: KpiStatusCounts;
  total: number;
}) {
  const segments = STATUS_DISPLAY_ORDER.map((status) => ({
    status,
    label: STATUS_META[status].label,
    color: STATUS_META[status].chartColor,
    count: getStatusCount(counts, status),
  }));
  const sum = segments.reduce((value, segment) => value + segment.count, 0) || total;
  const visible = segments.filter((segment) => segment.count > 0);

  return (
    <section
      aria-label="Phân bổ công việc theo trạng thái"
      className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 className="text-base font-extrabold text-blue-950">Phân bổ theo trạng thái</h2>
      <p className="mt-1 text-sm text-slate-500">
        Tổng {formatNumber(sum)} công việc trong kỳ.
      </p>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Chưa có công việc nào để thống kê.
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="mt-4 flex h-6 w-full gap-0.5 overflow-hidden rounded"
          >
            {visible.map((segment, index) => (
              <div
                className={`h-full min-w-1 ${index === 0 ? "rounded-l" : ""} ${
                  index === visible.length - 1 ? "rounded-r" : ""
                }`}
                key={segment.status}
                style={{
                  backgroundColor: segment.color,
                  flexGrow: segment.count,
                  flexBasis: 0,
                }}
                title={`${segment.label}: ${formatNumber(segment.count)}`}
              />
            ))}
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {segments.map((segment) => {
              const percent = sum > 0 ? Math.round((segment.count / sum) * 100) : 0;

              return (
                <li
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-slate-50/70"
                  key={segment.status}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {segment.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">
                    {formatNumber(segment.count)}
                    <span className="ml-1 font-semibold text-slate-500">({percent}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
