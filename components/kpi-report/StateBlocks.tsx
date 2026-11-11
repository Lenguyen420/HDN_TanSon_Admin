import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

export function KpiSkeleton({ groups = 4 }: { groups?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải báo cáo điểm…</span>
      <div className="grid gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" key={index} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: groups }).map((_, index) => (
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" key={index} />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mx-auto h-10 w-10 text-red-700" />
      <p className="mt-3 text-base font-bold text-red-800">
        Không tải được báo cáo điểm
      </p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      <button
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        Thử lại
      </button>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-10 text-center shadow-sm">
      <Inbox aria-hidden="true" className="mx-auto h-10 w-10 text-slate-400" />
      <p className="mt-3 text-base font-bold text-blue-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  );
}
