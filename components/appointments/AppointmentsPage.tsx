"use client";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { appointmentsApi, type Appointment, type AppointmentFilters, type AppointmentStatus } from "@/services/appointments";
import { remoteQueueApi, type Desk } from "@/services/remote-queue";
import AppointmentStatusBadge from "./AppointmentStatusBadge";
import AppointmentActionDialog from "./AppointmentActionDialog";
import { actionsForStatus, formatDateOnly, formatTimestamp, personName, type AppointmentAction } from "./appointment-utils";

const statusOptions: Array<[AppointmentStatus | "", string]> = [["", "Tất cả trạng thái"], ["PENDING", "Chờ duyệt"], ["APPROVED", "Đã duyệt"], ["CHECKED_IN", "Đã check-in"], ["IN_SERVICE", "Đang tiếp nhận"], ["COMPLETED", "Đã hoàn thành"], ["REJECTED", "Đã từ chối"], ["CANCELLED", "Đã hủy"], ["NO_SHOW", "Không đến"]];
const actionLabels: Record<AppointmentAction, string> = { approve: "Duyệt", reject: "Từ chối", reschedule: "Đổi giờ", cancel: "Hủy", checkIn: "Check-in", start: "Bắt đầu", complete: "Hoàn thành", noShow: "Không đến" };
export default function AppointmentsPage() {
  const search = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [pageData, setPageData] = useState({ items: [] as Appointment[], total: 0, page: 0, size: 20 });
  const [desks, setDesks] = useState<Desk[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [deskAssigneeNames, setDeskAssigneeNames] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState(""); const [dialog, setDialog] = useState<{ appointment: Appointment; action: AppointmentAction } | null>(null);
  const [serviceInput, setServiceInput] = useState(search.get("serviceName") || "");
  const filters = useMemo<AppointmentFilters>(() => ({ page: Number(search.get("page") || 0), size: 20, status: search.get("status") || "", date: search.get("date") || "", deskId: search.get("deskId") || "", serviceName: search.get("serviceName") || "" }), [search]);
  const setFilter = useCallback((key: string, value: string) => { const params = new URLSearchParams(search.toString()); if (value) params.set(key, value); else params.delete(key); if (key !== "page") params.delete("page"); router.replace(`${pathname}${params.size ? `?${params}` : ""}`); }, [pathname, router, search]);
  useEffect(() => { const timer = setTimeout(() => { if (serviceInput !== (search.get("serviceName") || "")) setFilter("serviceName", serviceInput.trim()); }, 400); return () => clearTimeout(timer); }, [serviceInput, search, setFilter]);
  const load = useCallback((signal?: AbortSignal) => { setLoading(true); setError(""); return appointmentsApi.list(filters, signal).then(setPageData).catch((e) => { if (e instanceof Error && e.name !== "AbortError") setError(e.message); }).finally(() => setLoading(false)); }, [filters]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load]);
  useEffect(() => {
    remoteQueueApi.desks(false).then(async (value) => {
      const items = value.items || [];
      setDesks(items);
      const assignments = await Promise.allSettled(items.map(async (desk) => {
        const result = await remoteQueueApi.assignees(desk.id);
        const names = (result.items || []).map((user) => user.name || user.username).filter(Boolean).join(", ");
        return [desk.id, names] as const;
      }));
      setDeskAssigneeNames(Object.fromEntries(assignments.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])));
    }).catch(() => { setDesks([]); setDeskAssigneeNames({}); });
  }, []);
  function reset() { setServiceInput(""); router.replace(pathname); }
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Quản lý hẹn làm việc</h1><p className="text-sm text-slate-500">Duyệt và vận hành lịch hẹn tại quầy</p></div>
      <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-semibold" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Làm mới</button></header>
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <section className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-5">
      <select aria-label="Trạng thái" className="min-h-11 rounded-xl border px-3" onChange={(e) => setFilter("status", e.target.value)} value={filters.status}>{statusOptions.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <input aria-label="Ngày hẹn" className="min-h-11 rounded-xl border px-3" onChange={(e) => setFilter("date", e.target.value)} type="date" value={filters.date} />
      <select aria-label="Quầy" className="min-h-11 rounded-xl border px-3" onChange={(e) => setFilter("deskId", e.target.value)} value={filters.deskId}><option value="">Tất cả quầy</option>{desks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}</select>
      <input aria-label="Tên thủ tục" className="min-h-11 rounded-xl border px-3" onChange={(e) => setServiceInput(e.target.value)} placeholder="Tên thủ tục/dịch vụ…" value={serviceInput} />
      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border font-semibold" onClick={reset}><RotateCcw className="h-4 w-4" /> Xóa bộ lọc</button>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {loading ? <div className="h-72 animate-pulse bg-slate-100" aria-label="Đang tải" /> : error ? <div className="p-10 text-center"><p className="text-red-700">{error}</p><button className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-white" onClick={() => void load()}>Thử lại</button></div> :
      !pageData.items.length ? <div className="p-12 text-center text-slate-500"><CalendarDays className="mx-auto mb-3 h-10 w-10" />Không có lịch hẹn phù hợp.</div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Mã","Người dân","Thủ tục","Ngày hẹn","Khung giờ","Quầy","Cán bộ","Trạng thái","Thời điểm tạo","Thao tác"].map((x) => <th className="px-4 py-3" key={x}>{x}</th>)}</tr></thead>
      <tbody className="divide-y">{pageData.items.map((item) => <tr className="align-top hover:bg-slate-50" key={item.id}>
        <td className="px-4 py-4 font-bold">{item.code}</td><td className="px-4 py-4"><strong>{item.contactName || "—"}</strong><div className="text-xs text-slate-500">{item.contactPhone || item.contactEmail || "—"}</div></td>
        <td className="max-w-64 px-4 py-4">{item.serviceName}</td><td className="px-4 py-4">{formatDateOnly(item.appointmentDate)}</td><td className="px-4 py-4">{item.startTime}–{item.endTime}</td>
        <td className="px-4 py-4">{item.desk?.name || item.desk?.code || item.deskId}</td><td className="max-w-56 px-4 py-4">{item.assignedUser ? personName(item.assignedUser) : deskAssigneeNames[item.deskId] || "Chưa phân công"}</td><td className="px-4 py-4"><AppointmentStatusBadge status={item.status} /></td>
        <td className="px-4 py-4">{formatTimestamp(item.createdAt)}</td><td className="px-4 py-4"><div className="flex max-w-64 flex-wrap gap-1.5"><Link className="action border" href={`/admin/appointments/${item.id}`}><Eye /> Xem</Link>{actionsForStatus(item.status).map((action) => <button className="action bg-red-700 text-white" key={action} onClick={() => setDialog({ appointment: item, action })}>{actionLabels[action]}</button>)}</div></td>
      </tr>)}</tbody></table></div>}
      <footer className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>Tổng {pageData.total} lịch hẹn</span><div className="flex items-center gap-2"><button aria-label="Trang trước" className="rounded-lg border p-2 disabled:opacity-40" disabled={filters.page <= 0} onClick={() => setFilter("page", String(filters.page - 1))}><ChevronLeft /></button><span>Trang {filters.page + 1}/{Math.max(1, Math.ceil(pageData.total / pageData.size))}</span><button aria-label="Trang sau" className="rounded-lg border p-2 disabled:opacity-40" disabled={(filters.page + 1) * pageData.size >= pageData.total} onClick={() => setFilter("page", String(filters.page + 1))}><ChevronRight /></button></div></footer>
    </section>
    {dialog && <AppointmentActionDialog {...dialog} onClose={() => setDialog(null)} onDone={(message) => { setDialog(null); setNotice(message); void load(); }} />}
  </div>;
}
