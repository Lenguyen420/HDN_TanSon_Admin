import { Minus, Plus } from "lucide-react";

import { formatNumber } from "./format";

function Step({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Operator({ icon: Icon }: { icon: typeof Plus }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full bg-slate-100 text-slate-500"
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function ScoreBreakdown({
  initialPoints,
  earned,
  deducted,
  score,
}: {
  initialPoints: number;
  earned: number;
  deducted: number;
  score: number;
}) {
  const good = score >= 100;

  return (
    <section
      aria-label="Diễn giải điểm"
      className="rounded-[20px] border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
    >
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Step
          hint="Điểm khởi tạo đầu kỳ"
          label="Khởi tạo"
          value={formatNumber(initialPoints)}
          valueClass="text-slate-800"
        />
        <Operator icon={Plus} />
        <Step
          hint="Từ việc hoàn thành"
          label="Điểm cộng"
          value={formatNumber(earned)}
          valueClass="text-emerald-700"
        />
        <Operator icon={Minus} />
        <Step
          hint="Từ việc chưa hoàn thành"
          label="Điểm trừ"
          value={formatNumber(deducted)}
          valueClass="text-red-700"
        />
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center self-center text-lg font-extrabold text-slate-400"
        >
          =
        </span>
        <div
          className={`min-w-0 flex-1 rounded-xl border-2 px-4 py-3 text-center ${
            good ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Điểm cuối
          </p>
          <p
            className={`mt-1 text-3xl font-extrabold tabular-nums ${
              good ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {formatNumber(score)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {good ? "Đạt từ 100 điểm trở lên" : "Dưới mốc 100 điểm"}
          </p>
        </div>
      </div>
    </section>
  );
}
