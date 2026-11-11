import type { TaskStatus } from "@/services/kpi-report";

import { STATUS_META } from "./format";

export default function TaskStatusBadge({
  status,
  className = "",
}: {
  status: TaskStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${meta.badgeClass} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}
