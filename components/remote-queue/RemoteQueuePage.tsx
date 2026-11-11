"use client";

import {
  Activity, AlertCircle, Ban, CheckCircle2, Clock3, Loader2, PauseCircle,
  Play, Plus, RefreshCw, Search, SkipForward, Store, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import Image from "next/image";
import { canManageRemoteQueue } from "@/components/auth/RemoteQueueGuard";
import { getAdminSystemRole, getStoredAdminToken, getStoredAdminUser } from "@/services/auth.service";
import {
  remoteQueueApi, RemoteQueueError, type DashboardDesk, type Desk, type DeskAssignee,
  type DeskPayload, type Ticket, type TicketPage, type TicketStatus,
} from "@/services/remote-queue";
import type { User } from "@/services/users";
import type { LucideIcon } from "lucide-react";
import { appointmentsApi } from "@/services/appointments";

const statusMeta: Record<TicketStatus, { label: string; className: string }> = {
  WAITING: { label: "Đang chờ", className: "bg-amber-100 text-amber-800" },
  SERVING: { label: "Đang phục vụ", className: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Đã hoàn thành", className: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Đã hủy", className: "bg-slate-200 text-slate-700" },
  SKIPPED: { label: "Bỏ lượt", className: "bg-orange-100 text-orange-800" },
  EXPIRED: { label: "Quá hạn", className: "bg-red-100 text-red-800" },
};

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function elapsed(value?: string | null) {
  if (!value) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return "—";
  return seconds < 60 ? `${seconds} giây` : `${Math.floor(seconds / 60)} phút`;
}

function Metric({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: LucideIcon; color: string;
}) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <Icon className={`h-5 w-5 ${color}`} />
    <strong className="mt-3 block text-2xl text-slate-900">{value}</strong>
    <span className="text-xs font-semibold text-slate-500">{label}</span>
  </article>;
}

function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const listener = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  return (
    <div aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog">
      <div className="max-h-dvh w-full overflow-auto bg-white p-5 shadow-2xl sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
          <button aria-label="Đóng" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100" onClick={onClose} ref={closeRef} type="button"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeskDialog({ desk, onClose, onSaved, notify }: {
  desk: Desk | null; onClose: () => void; onSaved: () => void; notify: (message: string, error?: boolean) => void;
}) {
  const [form, setForm] = useState<DeskPayload>(desk ? {
    name: desk.name, code: desk.code, category: desk.category, services: desk.services,
    isActive: desk.isActive, sortOrder: desk.sortOrder,
  } : { name: "", code: "", category: "", services: "", isActive: true, sortOrder: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), category: form.category.trim(), services: form.services.trim() };
    const next: Record<string, string> = {};
    if (payload.name.length < 2 || payload.name.length > 100) next.name = "Tên quầy phải từ 2–100 ký tự.";
    if (payload.code.length < 2 || payload.code.length > 30) next.code = "Mã quầy phải từ 2–30 ký tự.";
    if (payload.category.length < 2 || payload.category.length > 200) next.category = "Lĩnh vực phải từ 2–200 ký tự.";
    if (payload.services.length < 2 || payload.services.length > 2000) next.services = "Dịch vụ phải từ 2–2000 ký tự.";
    if (!Number.isInteger(payload.sortOrder) || payload.sortOrder < 0 || payload.sortOrder > 10000) next.sortOrder = "Thứ tự phải là số nguyên từ 0–10000.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      if (desk) await remoteQueueApi.updateDesk(desk.id, payload);
      else await remoteQueueApi.createDesk(payload);
      notify(desk ? "Đã cập nhật quầy." : "Đã tạo quầy mới.");
      onSaved();
    } catch (error) {
      if (error instanceof RemoteQueueError && error.status === 409) setErrors({ code: error.message });
      else notify(error instanceof Error ? error.message : "Không thể lưu quầy.", true);
    } finally { setSaving(false); }
  }

  const field = (key: keyof DeskPayload, label: string, maxLength?: number) => (
    <label className="block text-sm font-semibold text-slate-700">{label}
      <input className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
        maxLength={maxLength} onChange={(e) => setForm((old) => ({ ...old, [key]: key === "sortOrder" ? Number(e.target.value) : e.target.value }))}
        type={key === "sortOrder" ? "number" : "text"} value={String(form[key])} />
      {errors[key] ? <span className="mt-1 block text-xs text-red-600">{errors[key]}</span> : null}
    </label>
  );
  return (
    <Modal onClose={onClose} title={desk ? "Cập nhật quầy" : "Tạo quầy mới"}>
      <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={submit}>
        {field("name", "Tên quầy *", 100)} {field("code", "Mã quầy *", 30)}
        <div className="sm:col-span-2">{field("category", "Lĩnh vực *", 200)}</div>
        <label className="sm:col-span-2 text-sm font-semibold text-slate-700">Dịch vụ tiếp nhận *
          <textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-red-600" maxLength={2000} onChange={(e) => setForm({ ...form, services: e.target.value })} value={form.services} />
          {errors.services ? <span className="text-xs text-red-600">{errors.services}</span> : null}
        </label>
        {field("sortOrder", "Thứ tự hiển thị")}
        <label className="flex min-h-11 items-center gap-3 self-end rounded-xl bg-slate-50 px-4 text-sm font-semibold">
          <input checked={form.isActive} className="h-5 w-5 accent-red-700" onChange={(e) => setForm({ ...form, isActive: e.target.checked })} type="checkbox" />
          {form.isActive ? "Đang hoạt động" : "Tạm ngưng"}
        </label>
        {!form.isActive ? <p className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Quầy tạm ngưng sẽ không xuất hiện trên màn hình lấy số của người dân.</p> : null}
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-xl border border-slate-300 px-5" onClick={onClose} type="button">Hủy</button>
          <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving && <Loader2 className="animate-spin" />} Lưu quầy</button>
        </div>
      </form>
    </Modal>
  );
}

function AssigneeDialog({ desk, onClose, onSaved, notify }: {
  desk: Desk; onClose: () => void; onSaved: () => void; notify: (message: string, error?: boolean) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [original, setOriginal] = useState<DeskAssignee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    Promise.all([remoteQueueApi.users(), remoteQueueApi.assignees(desk.id)])
      .then(([all, assigned]) => {
        setUsers(all); setOriginal(assigned.items || []);
        setSelected(new Set((assigned.items || []).map((item) => item.id)));
      }).catch((e) => notify(e instanceof Error ? e.message : "Không thể tải cán bộ.", true))
      .finally(() => setLoading(false));
  }, [desk.id, notify]);
  const visible = users.filter((user) => `${user.name || ""} ${user.username || ""}`.toLowerCase().includes(search.toLowerCase()));
  const removed = original.filter((item) => !selected.has(item.id));
  async function save() {
    if (removed.length && !window.confirm(`Gỡ ${removed.map((item) => item.name || item.username).join(", ")}? Những cán bộ này sẽ không còn xem hoặc thao tác tại quầy.`)) return;
    setSaving(true);
    try {
      await remoteQueueApi.updateAssignees(desk.id, [...selected]);
      notify("Đã cập nhật phân công cán bộ."); onSaved();
    } catch (e) { notify(e instanceof Error ? e.message : "Không thể lưu phân công.", true); }
    finally { setSaving(false); }
  }
  return (
    <Modal onClose={onClose} title={`Phân công · ${desk.name} (${desk.code})`}>
      <div className="relative mt-5"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input aria-label="Tìm cán bộ" className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3" onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc username…" value={search} /></div>
      <p className="mt-3 text-sm font-semibold text-slate-600">Đã chọn: {selected.size} cán bộ</p>
      <div className="mt-3 max-h-[50vh] space-y-2 overflow-auto">
        {loading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100" /> : visible.map((user) => {
          const inactive = String(user.status || "ACTIVE").toUpperCase() !== "ACTIVE";
          return <label className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 ${inactive ? "opacity-50" : "hover:bg-slate-50"}`} key={user.id}>
            <input checked={selected.has(user.id)} className="h-5 w-5 accent-red-700" disabled={inactive && !selected.has(user.id)} onChange={(e) => setSelected((old) => { const next = new Set(old); if (e.target.checked) next.add(user.id); else next.delete(user.id); return next; })} type="checkbox" />
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-red-100 font-bold text-red-700">{user.avatar ? <Image alt="" className="h-full w-full object-cover" height={40} src={user.avatar} unoptimized width={40} /> : String(user.name || user.username || "?").charAt(0)}</div>
            <span className="min-w-0 flex-1"><strong className="block truncate">{user.name || user.username}</strong><span className="text-sm text-slate-500">@{user.username}{user.phone ? ` · ${user.phone}` : ""}</span></span>
            <span className="text-xs font-bold">{inactive ? "Không hoạt động" : "Hoạt động"}</span>
          </label>;
        })}
        {!loading && !visible.length ? <p className="py-8 text-center text-slate-500">Không tìm thấy cán bộ.</p> : null}
      </div>
      {removed.length ? <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sẽ gỡ: {removed.map((item) => item.name || item.username).join(", ")}</div> : null}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border px-5" onClick={onClose}>Hủy</button><button className="min-h-11 rounded-xl bg-red-700 px-5 font-bold text-white disabled:opacity-60" disabled={saving || loading} onClick={save}>{saving ? "Đang lưu…" : "Lưu phân công"}</button></div>
    </Modal>
  );
}

export default function RemoteQueuePage() {
  const [user] = useState(getStoredAdminUser);
  const isAdmin = getAdminSystemRole(user) === "ADMIN";
  const [date, setDate] = useState(localDate);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [dashboard, setDashboard] = useState<DashboardDesk[]>([]);
  const [tickets, setTickets] = useState<TicketPage>({ items: [], total: 0, page: 0, size: 20 });
  const [deskId, setDeskId] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [page, setPage] = useState(0);
  const [auto, setAuto] = useState(true);
  const [interval, setIntervalValue] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [deskDialog, setDeskDialog] = useState<Desk | null | "new">(null);
  const [assignDesk, setAssignDesk] = useState<Desk | null>(null);
  const [pendingTicket, setPendingTicket] = useState("");
  const [callingNext, setCallingNext] = useState(false);
  const requestActive = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  const notify = useCallback((message: string, error = false) => {
    setToast({ message, error }); window.setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async (background = false) => {
    if (requestActive.current) return;
    requestActive.current = true;
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const [deskData, dashboardData, ticketData] = await Promise.all([
        remoteQueueApi.desks(isAdmin), remoteQueueApi.dashboard(date),
        remoteQueueApi.tickets({ date, deskId: deskId || undefined, status, page, size: 20 }),
      ]);
      setDesks(deskData.items || []); setDashboard(dashboardData.desks || []); setTickets(ticketData);
      setUpdatedAt(new Date()); setError("");
      if (deskId && !(dashboardData.desks || []).some((item) => item.deskId === deskId)) setDeskId("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không thể tải dữ liệu.";
      if (!background) setError(message); else notify(`Làm mới thất bại: ${message}`, true);
    } finally { setLoading(false); setRefreshing(false); requestActive.current = false; }
  }, [date, deskId, status, page, isAdmin, notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, interval * 1000);
    const visible = () => document.visibilityState === "visible" && void load(true);
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", visible); };
  }, [auto, interval, load]);

  useEffect(() => {
    if (!canManageRemoteQueue(user)) return;
    const backend = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backend) return;
    const socket = io(`${backend.replace(/\/$/, "")}/remote-queue`, {
      auth: { token: getStoredAdminToken() }, transports: ["websocket", "polling"],
      reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;
    const refetch = () => void load(true);
    const created = (ticket: Ticket) => { notify(`Có lượt mới số ${ticket.number} tại ${ticket.deskName}`); refetch(); };
    socket.on("connect", refetch); socket.on("ticket-created", created);
    ["ticket-status-updated", "queue-updated", "desk-created", "desk-updated", "desk-assignees-updated", "desk-assignment-updated"].forEach((event) => socket.on(event, refetch));
    return () => { if (deskId) socket.emit("leave-desk", { deskId, serviceDate: date }); socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
  }, [date, deskId, load, notify, user]);
  useEffect(() => {
    if (!deskId || !socketRef.current) return;
    socketRef.current.emit("join-desk", { deskId, serviceDate: date });
    return () => { socketRef.current?.emit("leave-desk", { deskId, serviceDate: date }); };
  }, [deskId, date]);

  const orderedTickets = useMemo(() => [...tickets.items].sort((a, b) => {
    const rank = (s: TicketStatus) => s === "SERVING" ? 0 : s === "WAITING" ? 1 : 2;
    const delta = rank(a.status) - rank(b.status);
    if (delta) return delta;
    if (a.status === "WAITING") return a.number.localeCompare(b.number, "vi", { numeric: true });
    return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
  }), [tickets.items]);
  const selectedDashboard = dashboard.find((item) => item.deskId === deskId);
  const serving = orderedTickets.find((item) => item.status === "SERVING" && (!deskId || item.deskId === deskId));
  const totals = dashboard.reduce((sum, item) => ({
    waiting: sum.waiting + item.waiting, serving: sum.serving + item.serving,
    completed: sum.completed + item.completed, cancelled: sum.cancelled + item.cancelled,
    skipped: sum.skipped + item.skipped, expired: sum.expired + (item.expired || 0),
  }), { waiting: 0, serving: 0, completed: 0, cancelled: 0, skipped: 0, expired: 0 });
  const total = Object.values(totals).reduce((a, b) => a + b, 0);

  async function changeStatus(ticket: Ticket, next: "SERVING" | "COMPLETED" | "SKIPPED" | "EXPIRED") {
    if (pendingTicket) return;
    if (next === "SERVING" && serving) { notify("Hãy kết thúc lượt đang phục vụ trước khi gọi số tiếp theo.", true); return; }
    const label = next === "SERVING" ? "Gọi số" : next === "COMPLETED" ? "Hoàn thành" : next === "SKIPPED" ? "Bỏ lượt" : "Đánh dấu quá hạn";
    if (!window.confirm(`${label} ${ticket.number} tại ${ticket.deskName}?`)) return;
    setPendingTicket(ticket.id);
    try { await remoteQueueApi.updateStatus(ticket.id, next); notify(`${label} thành công.`); await load(true); }
    catch (e) { notify(e instanceof Error ? e.message : "Không thể cập nhật trạng thái.", true); }
    finally { setPendingTicket(""); }
  }

  async function callNext() {
    if (!deskId || callingNext) return;
    setCallingNext(true);
    try {
      const result = await appointmentsApi.callNext(deskId);
      if (!result) notify("Không còn lượt chờ tại quầy.");
      else if (result.serviceType === "APPOINTMENT") {
        const item = result.item as { code?: string; contactName?: string };
        notify(`Đã gọi lịch hẹn ${item.code || ""}${item.contactName ? ` · ${item.contactName}` : ""}.`);
      } else {
        const item = result.item as { number?: string };
        notify(`Đã gọi số trực tuyến ${item.number || ""}.`);
      }
      await load(true);
    } catch (e) { notify(e instanceof Error ? e.message : "Không thể gọi lượt tiếp theo.", true); }
    finally { setCallingNext(false); }
  }

  const actions = (ticket: Ticket) => {
    if (!["WAITING", "SERVING"].includes(ticket.status)) return null;
    return <div className="flex flex-wrap gap-2">
      {ticket.status === "WAITING" && <button className="action bg-blue-700 text-white" disabled={!!pendingTicket} onClick={() => changeStatus(ticket, "SERVING")}><Play /> Gọi số</button>}
      {ticket.status === "SERVING" && <button className="action bg-emerald-700 text-white" disabled={!!pendingTicket} onClick={() => changeStatus(ticket, "COMPLETED")}><CheckCircle2 /> Hoàn thành</button>}
      <button className="action border border-orange-300 text-orange-800" disabled={!!pendingTicket} onClick={() => changeStatus(ticket, "SKIPPED")}><SkipForward /> Bỏ lượt</button>
      <button className="action border border-red-300 text-red-700" disabled={!!pendingTicket} onClick={() => changeStatus(ticket, "EXPIRED")}><Ban /> Quá hạn</button>
    </div>;
  };

  if (loading) return <div className="space-y-5"><div className="h-36 animate-pulse rounded-2xl bg-slate-200" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div className="h-28 animate-pulse rounded-2xl bg-slate-200" key={i} />)}</div><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /></div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-white p-8 text-center"><AlertCircle className="mx-auto text-red-600" /><h2 className="mt-3 font-bold">Không thể tải dữ liệu</h2><p className="mt-2 text-sm text-slate-600">{error}</p><button className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 text-white" onClick={() => load(false)}>Thử lại</button></div>;

  return (
    <div className="space-y-6">
      {toast && <div aria-live="polite" className={`fixed right-4 top-4 z-[120] max-w-sm rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.error ? "bg-red-700" : "bg-emerald-700"}`}>{toast.message}</div>}
      <header className="rounded-2xl bg-gradient-to-r from-red-800 to-red-600 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-bold uppercase tracking-widest text-red-100">Trung tâm Hành chính công · Phường Gò Dầu</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Quản lý lấy số từ xa</h1><p className="mt-2 text-sm text-red-50">Theo dõi và điều phối lượt phục vụ tại Trung tâm Hành chính công</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:flex">
            <label className="text-sm">Ngày đang xem<input className="mt-1 block min-h-11 rounded-xl border border-white/30 bg-white px-3 text-slate-900" onChange={(e) => { setDate(e.target.value); setPage(0); }} type="date" value={date} /></label>
            <button className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 font-bold text-red-700" disabled={refreshing} onClick={() => load(true)}><RefreshCw className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Đang cập nhật…" : "Làm mới"}</button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/20 pt-4 text-sm">
          <label className="flex items-center gap-2"><input checked={auto} className="h-5 w-5 accent-yellow-300" onChange={(e) => setAuto(e.target.checked)} type="checkbox" /> Tự động cập nhật</label>
          <label>Chu kỳ <select className="ml-2 min-h-10 rounded-lg bg-white px-3 text-slate-900" onChange={(e) => setIntervalValue(Number(e.target.value))} value={interval}>{[5,10,30,60].map((v) => <option key={v} value={v}>{v} giây</option>)}</select></label>
          <span className="text-red-100">Cập nhật gần nhất: {updatedAt ? formatTime(updatedAt.toISOString()) : "Chưa có"}</span>
        </div>
      </header>

      <section aria-label="Thống kê" className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {([
          ["Tổng lượt", total, Activity, "text-violet-700"], ["Đang chờ", totals.waiting, Clock3, "text-amber-700"],
          ["Đang phục vụ", totals.serving, Play, "text-blue-700"], ["Hoàn thành", totals.completed, CheckCircle2, "text-emerald-700"],
          ["Đã hủy", totals.cancelled, PauseCircle, "text-slate-600"], ["Bỏ lượt", totals.skipped, SkipForward, "text-orange-700"],
          ["Quá hạn", totals.expired, Ban, "text-red-700"], ["Quầy hoạt động", desks.filter((d) => d.isActive).length, Store, "text-cyan-700"],
        ] satisfies Array<[string, number, LucideIcon, string]>).map(([label, value, Icon, color]) => <Metric color={color} icon={Icon} key={label} label={label} value={value} />)}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-extrabold">Các quầy tiếp nhận</h2><p className="text-sm text-slate-500">{dashboard.length} quầy trong phạm vi được cấp</p></div>{isAdmin && <button className="flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 font-bold text-white" onClick={() => setDeskDialog("new")}><Plus /> Tạo quầy</button>}</div>
        {!dashboard.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Users className="mx-auto text-slate-400" /><p className="mt-3 font-semibold">{isAdmin ? "Ngày này chưa có dữ liệu quầy." : "Bạn chưa được phân công quầy tiếp nhận. Vui lòng liên hệ quản trị viên."}</p></div> :
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dashboard.map((item) => {
          const desk = desks.find((d) => d.id === item.deskId);
          return <article className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition ${deskId === item.deskId ? "border-red-600 ring-4 ring-red-100" : "border-transparent"}`} key={item.deskId}>
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">{item.deskName}</h3><span className="mt-1 inline-block rounded-md bg-slate-900 px-2 py-1 text-xs font-bold text-white">{item.deskCode}</span></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${desk?.isActive === false ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{desk?.isActive === false ? "Tạm ngưng" : "Hoạt động"}</span></div>
            <p className="mt-4 font-semibold text-slate-800">{desk?.category || "Chưa có lĩnh vực"}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{desk?.services || "Chưa có mô tả dịch vụ"}</p>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><Users className="mt-0.5 shrink-0 text-slate-500" /><div><span className="font-semibold text-slate-700">Người phụ trách:</span> <span className="text-slate-600">{item.assignees?.length ? item.assignees.map((assignee) => assignee.name).join(", ") : "Chưa phân công"}</span></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center"><div><strong className="block text-xl text-blue-700">{item.currentNumber || "Chưa có"}</strong><span className="text-xs">Đang phục vụ</span></div><div><strong className="block text-xl text-amber-700">{item.waiting}</strong><span className="text-xs">Đang chờ</span></div><div><strong className="block text-xl text-emerald-700">{item.completed}</strong><span className="text-xs">Hoàn thành</span></div></div>
            <p className="mt-3 text-xs text-slate-500">Đã hủy: {item.cancelled} · Bỏ lượt: {item.skipped}</p>
            <div className="mt-4 flex flex-wrap gap-2"><button className="min-h-11 flex-1 rounded-xl bg-slate-900 px-3 font-bold text-white" onClick={() => { setDeskId(item.deskId); setPage(0); }}>Xem hàng chờ</button>{isAdmin && desk && <><button className="min-h-11 rounded-xl border px-3 font-semibold" onClick={() => setDeskDialog(desk)}>Sửa quầy</button><button className="min-h-11 rounded-xl border px-3 font-semibold" onClick={() => setAssignDesk(desk)}>Phân công</button></>}</div>
          </article>;
        })}</div>}
      </section>

      {deskId && <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-slate-300">{selectedDashboard?.deskName} · {selectedDashboard?.deskCode}</p><button className="action min-h-11 bg-yellow-400 text-slate-950 disabled:opacity-60" disabled={callingNext || !!serving} onClick={callNext}><Play />{callingNext ? "Đang gọi…" : "Gọi lượt tiếp theo"}</button></div>{serving ? <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-sm text-slate-300">Số trực tuyến đang phục vụ</p><strong className="block text-6xl font-black text-yellow-300">{serving.number}</strong><p className="mt-3 text-sm">Bắt đầu: {formatTime(serving.servedAt)} · Đã phục vụ: {elapsed(serving.servedAt)}</p></div>{actions(serving)}</div> : <div className="mt-4"><p className="font-bold">Chưa có người đang phục vụ</p><p className="text-sm text-slate-400">Backend sẽ ưu tiên lịch hẹn đã check-in trước số trực tuyến đang chờ.</p></div>}</section>}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-3"><label className="text-sm font-semibold">Quầy<select className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal" onChange={(e) => { setDeskId(e.target.value); setPage(0); }} value={deskId}><option value="">Tất cả quầy</option>{dashboard.map((d) => <option key={d.deskId} value={d.deskId}>{d.deskName} ({d.deskCode})</option>)}</select></label><label className="text-sm font-semibold">Trạng thái<select className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal" onChange={(e) => { setStatus(e.target.value as TicketStatus | ""); setPage(0); }} value={status}><option value="">Tất cả trạng thái</option>{Object.entries(statusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label><div className="self-end text-sm text-slate-500">Tìm thấy {tickets.total} lượt</div></div>
        {!orderedTickets.length ? <div className="p-10 text-center text-slate-500"><Search className="mx-auto" /><p className="mt-3">{status || deskId ? "Không có ticket phù hợp bộ lọc." : "Ngày này chưa có lượt lấy số."}</p></div> :
        <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Số thứ tự","Quầy","Lĩnh vực","Thời gian lấy số","Thời gian chờ","Phía trước","Trạng thái","Thao tác"].map((v) => <th className="px-4 py-3" key={v}>{v}</th>)}</tr></thead><tbody>{orderedTickets.map((ticket) => <tr className="border-t align-top" key={ticket.id}><td className="px-4 py-4 text-2xl font-black text-red-700">{ticket.number}</td><td className="px-4 py-4 font-semibold">{ticket.deskName}<span className="block text-xs text-slate-500">{ticket.deskCode}</span></td><td className="max-w-48 px-4 py-4">{ticket.category}</td><td className="px-4 py-4">{formatTime(ticket.createdAt)}</td><td className="px-4 py-4">{ticket.status === "WAITING" ? elapsed(ticket.createdAt) : "—"}</td><td className="px-4 py-4">{ticket.peopleAhead ?? 0}</td><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta[ticket.status].className}`}>{statusMeta[ticket.status].label}</span></td><td className="sticky right-0 bg-white px-4 py-4">{actions(ticket)}</td></tr>)}</tbody></table></div>
        <div className="space-y-3 p-3 md:hidden">{orderedTickets.map((ticket) => <article className="rounded-xl border p-4" key={ticket.id}><div className="flex items-center justify-between"><strong className="text-3xl text-red-700">{ticket.number}</strong><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta[ticket.status].className}`}>{statusMeta[ticket.status].label}</span></div><p className="mt-3 font-bold">{ticket.deskName} · {ticket.deskCode}</p><p className="mt-1 text-sm text-slate-500">Lấy số: {formatTime(ticket.createdAt)} · Chờ: {ticket.status === "WAITING" ? elapsed(ticket.createdAt) : "—"} · Phía trước: {ticket.peopleAhead ?? 0}</p><div className="mt-4">{actions(ticket)}</div></article>)}</div></>}
        {tickets.total > tickets.size && <div className="flex items-center justify-between border-t p-4"><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trang trước</button><span className="text-sm">Trang {page + 1} / {Math.ceil(tickets.total / tickets.size)}</span><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={(page + 1) * tickets.size >= tickets.total} onClick={() => setPage((p) => p + 1)}>Trang sau</button></div>}
      </section>
      {deskDialog && <DeskDialog desk={deskDialog === "new" ? null : deskDialog} notify={notify} onClose={() => setDeskDialog(null)} onSaved={() => { setDeskDialog(null); void load(true); }} />}
      {assignDesk && <AssigneeDialog desk={assignDesk} notify={notify} onClose={() => setAssignDesk(null)} onSaved={() => { setAssignDesk(null); void load(true); }} />}
    </div>
  );
}
