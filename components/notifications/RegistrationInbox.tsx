"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import api from "@/services/api/axiosConfig";
import { getStoredAdminUser } from "@/services/api/authSession";
interface Notice { id: string; registrationId: string; title: string; description: string; status: "pending" | "approved" | "rejected"; createdAt: string; href: string; }
const Context = createContext<{items: Notice[]; pending: number; readIds: string[]; markRead: (id: string) => void; error: string}>({items: [], pending: 0, readIds: [], markRead: () => {}, error: ""});
export function RegistrationInboxProvider({children}: {children: ReactNode}) {
  const [items, setItems] = useState<Notice[]>([]);
  const [pending, setPending] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true, busy = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const {data} = await api.get<{data: Notice[]; pendingCount: number}>("/association/registration-inbox?limit=100", {signal: controller.signal});
        if (active) { setItems(data.data); setPending(data.pendingCount); setError(""); }
      } catch { if (active) setError("Chưa cập nhật được thông báo đăng ký. Hệ thống sẽ tự thử lại."); }
      finally { busy = false; }
    };
    const storageKey = "tanson-admin-registration-read-" + (getStoredAdminUser()?.username || "admin");
    const readTimer = window.setTimeout(() => {
      try { const value: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]"); if (Array.isArray(value)) setReadIds(value.filter((v): v is string => typeof v === "string")); } catch { /* Read state stays in memory. */ }
    }, 0);
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    const wake = () => { void refresh(); };
    window.addEventListener("focus", wake); document.addEventListener("visibilitychange", wake);
    return () => { active = false; window.clearTimeout(readTimer); controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", wake); document.removeEventListener("visibilitychange", wake); };
  }, []);
  const markRead = (id: string) => setReadIds((current) => {
    const next = [...new Set([...current, id])].slice(-1000);
    try { localStorage.setItem("tanson-admin-registration-read-" + (getStoredAdminUser()?.username || "admin"), JSON.stringify(next)); } catch { /* Keep read state in memory. */ }
    return next;
  });
  return <Context.Provider value={{items, pending, readIds, markRead, error}}>{children}</Context.Provider>;
}
export function RegistrationInboxLink() {
  const {items, readIds} = useContext(Context);
  const unread = items.filter((item) => !readIds.includes(item.id)).length;
  return <Link href="/admin/notifications" className="icon-button" aria-label={unread ? unread + " thông báo đăng ký chưa đọc" : "Thông báo đăng ký"}><Bell size={21}/>{unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}</Link>;
}
export default function RegistrationInbox() {
  const {items, pending, readIds, markRead, error} = useContext(Context);
  const labels = {pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Đã từ chối"};
  return <section aria-labelledby="registration-inbox-heading" style={{marginBottom: 24, padding: 24, border: "1px solid #e2e8f0", borderRadius: 16, background: "white"}}>
    <h2 id="registration-inbox-heading">Thông báo đăng ký hội viên</h2>
    <p>{pending} hồ sơ chờ duyệt · Tự cập nhật khi ứng dụng đang mở</p>
    {error && <p role="status">{error}</p>}
    {!items.length && !error && <p>Chưa có hồ sơ đăng ký.</p>}
    <div>{items.map((item) => <Link key={item.id} href={item.href + "?registrationId=" + encodeURIComponent(item.registrationId)} onClick={() => markRead(item.id)} style={{display: "block", padding: "16px 0", borderBottom: "1px solid #e2e8f0", color: "inherit", textDecoration: "none"}}>
      <strong>{!readIds.includes(item.id) && "● "}{item.title}</strong><p>{item.description}</p><small>{new Date(item.createdAt).toLocaleString("vi-VN")} · {labels[item.status]}</small>
    </Link>)}</div>
    <p><Link href="/admin/registrations">Xem tất cả hồ sơ và xét duyệt</Link></p>
  </section>;
}
