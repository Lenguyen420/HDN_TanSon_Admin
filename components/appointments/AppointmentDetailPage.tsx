"use client";
import Link from "next/link";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { appointmentsApi, type Appointment } from "@/services/appointments";
import AppointmentStatusBadge from "./AppointmentStatusBadge";
import AppointmentActionDialog from "./AppointmentActionDialog";
import { actionsForStatus, formatDateOnly, formatTimestamp, personName, type AppointmentAction } from "./appointment-utils";
const labels: Record<AppointmentAction, string> = { approve:"Duyệt", reject:"Từ chối", reschedule:"Đổi giờ", cancel:"Hủy", checkIn:"Check-in", start:"Bắt đầu", complete:"Hoàn thành", noShow:"Không đến" };
function Field({ label, value }: { label: string; value?: React.ReactNode }) { return <div><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value || "—"}</dd></div>; }
export default function AppointmentDetailPage({ id }: { id: string }) {
  const [item,setItem]=useState<Appointment|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [action,setAction]=useState<AppointmentAction|null>(null);
  const load=useCallback((signal?:AbortSignal)=>{setLoading(true);setError("");return appointmentsApi.detail(id,signal).then(setItem).catch(e=>{if(e instanceof Error&&e.name!=="AbortError")setError(e.message)}).finally(()=>setLoading(false))},[id]);
  useEffect(()=>{const c=new AbortController();const timer=window.setTimeout(()=>void load(c.signal),0);return()=>{window.clearTimeout(timer);c.abort()}},[load]);
  if(loading)return <div className="h-96 animate-pulse rounded-2xl bg-slate-200"/>;
  if(error||!item)return <div className="rounded-2xl border bg-white p-10 text-center text-red-700">{error||"Không tìm thấy lịch hẹn."}<br/><button className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-white" onClick={()=>void load()}>Thử lại</button></div>;
  const history=[...(item.history||[])].sort((a,b)=>String(a.createdAt||a.timestamp).localeCompare(String(b.createdAt||b.timestamp)));
  return <div className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><Link className="inline-flex items-center gap-1 text-sm text-slate-500" href="/admin/appointments"><ArrowLeft className="h-4 w-4"/> Danh sách lịch hẹn</Link><h1 className="mt-2 text-2xl font-extrabold">{item.code}</h1></div><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4" onClick={()=>void load()}><RefreshCw className="h-4 w-4"/>Làm mới</button></header>
  {notice&&<p className="rounded-xl bg-emerald-50 p-3 text-emerald-800">{notice}</p>}
  <div className="flex flex-wrap gap-2">{actionsForStatus(item.status).map(a=><button className="action bg-red-700 text-white" key={a} onClick={()=>setAction(a)}>{labels[a]}</button>)}</div>
  <div className="grid gap-5 lg:grid-cols-2"><Section title="Thông tin lịch"><dl className="grid gap-4 sm:grid-cols-2"><Field label="Trạng thái" value={<AppointmentStatusBadge status={item.status}/>} /><Field label="Thủ tục" value={item.serviceName}/><Field label="Ngày hẹn" value={formatDateOnly(item.appointmentDate)}/><Field label="Khung giờ" value={`${item.startTime}–${item.endTime}`}/><Field label="Quầy/đơn vị" value={item.desk?.name||item.desk?.code||item.deskId}/><Field label="Ghi chú" value={item.note||item.notes}/></dl></Section>
  <Section title="Thông tin người dân"><dl className="grid gap-4"><Field label="Họ tên" value={item.contactName}/><Field label="Số điện thoại" value={item.contactPhone}/><Field label="Email" value={item.contactEmail}/></dl></Section>
  <Section title="Thông tin tiếp nhận"><dl className="grid gap-4 sm:grid-cols-2"><Field label="Người được phân công" value={personName(item.assignedUser)}/><Field label="Người thực tế tiếp nhận" value={personName(item.handler)}/><Field label="Check-in" value={formatTimestamp(item.checkedInAt)}/><Field label="Bắt đầu" value={formatTimestamp(item.startedAt)}/><Field label="Hoàn thành" value={formatTimestamp(item.completedAt)}/></dl></Section>
  <Section title="Hồ sơ đính kèm">{item.attachmentIds?.length?<ul className="space-y-2">{item.attachmentIds.map(x=><li className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm" key={x}><FileText className="h-4 w-4"/>{x}</li>)}</ul>:<p className="text-sm text-slate-500">Không có hồ sơ đính kèm.</p>}</Section></div>
  <Section title="Lịch sử trạng thái">{history.length?<ol className="relative ml-2 border-l-2 border-slate-200 pl-6">{history.map((h,i)=><li className="relative pb-6" key={h.id||i}><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-red-700"/><strong>{h.fromStatus?`${h.fromStatus} → `:""}{h.toStatus||h.status||"Cập nhật"}</strong><p className="text-sm text-slate-500">{formatTimestamp(h.createdAt||h.timestamp)} · {personName(h.actor)}</p>{h.reason&&<p className="mt-1 text-sm">Lý do: {h.reason}</p>}{h.metadata&&<pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-2 text-xs">{JSON.stringify(h.metadata,null,2)}</pre>}</li>)}</ol>:<p className="text-sm text-slate-500">Chưa có lịch sử.</p>}</Section>
  {action&&<AppointmentActionDialog action={action} appointment={item} onClose={()=>setAction(null)} onDone={m=>{setAction(null);setNotice(m);void load()}}/>}</div>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-extrabold">{title}</h2>{children}</section>}
