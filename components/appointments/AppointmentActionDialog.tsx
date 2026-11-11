"use client";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppointmentApiError, appointmentsApi, type Appointment, type AvailabilitySlot } from "@/services/appointments";
import type { AppointmentAction } from "./appointment-utils";

const titles: Record<AppointmentAction, string> = {
  approve: "Duyệt lịch hẹn", reject: "Từ chối lịch hẹn", reschedule: "Đổi ngày/khung giờ", cancel: "Hủy lịch hẹn",
  checkIn: "Xác nhận check-in", start: "Bắt đầu tiếp nhận", complete: "Hoàn thành lịch hẹn", noShow: "Đánh dấu không đến",
};
export default function AppointmentActionDialog({ appointment, action, onClose, onDone }: {
  appointment: Appointment; action: AppointmentAction; onClose: () => void; onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState(""); const [date, setDate] = useState(appointment.appointmentDate);
  const [slot, setSlot] = useState(""); const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const needsReason = action === "reject" || action === "cancel" || action === "reschedule";
  useEffect(() => {
    if (action !== "reschedule" || !date || !appointment.deskId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingSlots(true); setSlot("");
      appointmentsApi.availability(appointment.deskId, date, controller.signal).then((value) => setSlots(value.slots || []))
        .catch((e) => { if (e instanceof Error && e.name !== "AbortError") setError(e.message); }).finally(() => setLoadingSlots(false));
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [action, appointment.deskId, date]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); const trimmed = reason.trim();
    if (needsReason && !trimmed) return setError("Vui lòng nhập lý do.");
    const selected = slots.find((item) => `${item.startTime}|${item.endTime}` === slot && item.remaining > 0);
    if (action === "reschedule" && !selected) return setError("Vui lòng chọn một khung giờ còn chỗ.");
    setSaving(true); setError("");
    try {
      if (action === "approve") await appointmentsApi.approve(appointment.id);
      else if (action === "reject") await appointmentsApi.reject(appointment.id, trimmed);
      else if (action === "cancel") await appointmentsApi.cancel(appointment.id, trimmed);
      else if (action === "checkIn") await appointmentsApi.checkIn(appointment.id, trimmed || undefined);
      else if (action === "start") await appointmentsApi.start(appointment.id);
      else if (action === "complete") await appointmentsApi.complete(appointment.id);
      else if (action === "noShow") await appointmentsApi.noShow(appointment.id);
      else if (selected) await appointmentsApi.reschedule(appointment.id, { appointmentDate: date, startTime: selected.startTime, endTime: selected.endTime, reason: trimmed });
      onDone(`${titles[action]} thành công.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xử lý yêu cầu.");
      if (action === "reschedule" && e instanceof AppointmentApiError && e.status === 409) {
        try { setSlots((await appointmentsApi.availability(appointment.deskId, date)).slots || []); setSlot(""); } catch { /* retain business error */ }
      }
    } finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true">
    <section className="w-full max-w-xl bg-white p-5 shadow-2xl sm:rounded-2xl">
      <header className="flex items-center justify-between border-b pb-4"><h2 className="text-lg font-extrabold">{titles[action]}</h2>
        <button aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}><X /></button></header>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">Lịch hẹn <strong>{appointment.code}</strong> · {appointment.contactName || "Người dân"}</p>
        {action === "reschedule" && <><label className="block text-sm font-semibold">Ngày hẹn
          <input className="mt-2 min-h-11 w-full rounded-xl border px-3" min={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())} onChange={(e) => setDate(e.target.value)} type="date" value={date} />
        </label><fieldset><legend className="text-sm font-semibold">Khung giờ còn chỗ</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{loadingSlots ? <span>Đang tải khung giờ…</span> : slots.map((item) =>
            <label className={`rounded-xl border p-3 text-sm ${item.remaining ? "cursor-pointer" : "bg-slate-100 opacity-60"}`} key={`${item.startTime}-${item.endTime}`}>
              <input checked={slot === `${item.startTime}|${item.endTime}`} disabled={item.remaining <= 0} name="slot" onChange={() => setSlot(`${item.startTime}|${item.endTime}`)} type="radio" /> <strong>{item.startTime}–{item.endTime}</strong> · còn {item.remaining}
            </label>)}</div>{!loadingSlots && !slots.length && <p className="mt-2 text-sm text-slate-500">Không có khung giờ khả dụng.</p>}
        </fieldset></>}
        {(needsReason || action === "checkIn") && <label className="block text-sm font-semibold">{action === "checkIn" ? "Ghi chú (không bắt buộc)" : "Lý do *"}
          <textarea className="mt-2 min-h-24 w-full rounded-xl border p-3" onChange={(e) => setReason(e.target.value)} value={reason} />
        </label>}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <footer className="flex justify-end gap-3"><button className="min-h-11 rounded-xl border px-5" onClick={onClose} type="button">Đóng</button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-5 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận</button></footer>
      </form>
    </section>
  </div>;
}
