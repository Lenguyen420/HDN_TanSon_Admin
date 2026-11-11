import { appointmentStatusMeta } from "./appointment-utils";
import type { AppointmentStatus } from "@/services/appointments";
export default function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = appointmentStatusMeta[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>;
}
