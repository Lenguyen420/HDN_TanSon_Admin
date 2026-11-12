"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, ClipboardList, X } from "lucide-react";
import { createBackgroundPoller } from "@/services/background-polling";
import api from "@/services/api/axiosConfig";
import { getStoredAdminUser } from "@/services/api/authSession";
interface Notice {
  id: string;
  registrationId?: string;
  eventId?: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "absent";
  createdAt: string;
  href: string;
}
const Context = createContext<{
  items: Notice[];
  pending: number;
  readIds: string[];
  markRead: (id: string) => void;
  error: string;
}>({ items: [], pending: 0, readIds: [], markRead: () => {}, error: "" });
export function RegistrationInboxProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [registrationItems, setRegistrationItems] = useState<Notice[]>([]);
  const [eventItems, setEventItems] = useState<Notice[]>([]);
  const items = [...registrationItems, ...eventItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const [pending, setPending] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      busy = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const [registrations, events] = await Promise.allSettled([
          api.get<{ data: Notice[]; pendingCount: number }>(
            "/association/registration-inbox?limit=100",
            { signal: controller.signal },
          ),
          api.get<{ data: Notice[] }>("/association/event-inbox?limit=100", {
            signal: controller.signal,
          }),
        ]);
        if (active) {
          if (registrations.status === "fulfilled") {
            setRegistrationItems(registrations.value.data.data);
            setPending(registrations.value.data.pendingCount);
          }
          if (events.status === "fulfilled")
            setEventItems(events.value.data.data);
          setError(
            registrations.status === "rejected" || events.status === "rejected"
              ? "Chưa tải đủ thông báo. Hệ thống sẽ tự thử lại."
              : "",
          );
        }
      } catch {
        if (active)
          setError(
            "Chưa cập nhật được thông báo đăng ký. Hệ thống sẽ tự thử lại.",
          );
      } finally {
        busy = false;
      }
    };
    const storageKey =
      "tanson-admin-registration-read-" +
      (getStoredAdminUser()?.username || "admin");
    const readTimer = window.setTimeout(() => {
      try {
        const value: unknown = JSON.parse(
          localStorage.getItem(storageKey) || "[]",
        );
        if (Array.isArray(value))
          setReadIds(value.filter((v): v is string => typeof v === "string"));
      } catch {
        /* Read state stays in memory. */
      }
    }, 0);
    const poller = createBackgroundPoller(
      refresh,
      () => document.visibilityState !== "hidden",
    );
    void poller.refresh();
    const wake = () => {
      void poller.refresh();
    };
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false;
      window.clearTimeout(readTimer);
      controller.abort();
      poller.stop();
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);
  const markRead = (id: string) =>
    setReadIds((current) => {
      const next = [...new Set([...current, id])].slice(-1000);
      try {
        localStorage.setItem(
          "tanson-admin-registration-read-" +
            (getStoredAdminUser()?.username || "admin"),
          JSON.stringify(next),
        );
      } catch {
        /* Keep read state in memory. */
      }
      return next;
    });
  return (
    <Context.Provider value={{ items, pending, readIds, markRead, error }}>
      {children}
    </Context.Provider>
  );
}
export function RegistrationInboxLink() {
  const { items, pending, readIds, markRead, error } = useContext(Context);
  const unread = items.filter((item) => !readIds.includes(item.id)).length;
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const labels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    absent: "Vắng mặt",
  };
  return (
    <div className="registration-bell" ref={container}>
      <button
        ref={trigger}
        type="button"
        className={"registration-bell-trigger" + (open ? " is-open" : "")}
        aria-label={unread ? unread + " thông báo chưa đọc" : "Thông báo"}
        aria-expanded={open}
        aria-controls="registration-bell-panel"
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        <Bell size={21} />
        {unread > 0 && (
          <span className="registration-bell-badge">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id="registration-bell-panel"
          role="dialog"
          aria-label="Thông báo từ Hội"
          className="registration-bell-panel"
        >
          <header>
            <div>
              <span className="registration-bell-eyebrow">
                TRUNG TÂM THÔNG BÁO
              </span>
              <h2>
                Thông báo <span>{unread}</span>
              </h2>
              <p>{pending} hồ sơ đang chờ xét duyệt</p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Đóng thông báo"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          <div className="registration-bell-toolbar">
            <span>
              <i /> Cập nhật tự động
            </span>
            <button
              type="button"
              disabled={!unread}
              onClick={() => items.forEach((item) => markRead(item.id))}
            >
              <CheckCheck size={15} />
              Đọc tất cả
            </button>
          </div>
          {error && (
            <p role="status" className="registration-bell-error">
              {error}
            </p>
          )}
          <div className="registration-bell-list">
            {!items.length && (
              <div className="registration-bell-empty">
                <Bell size={28} />
                <strong>Chưa có thông báo mới</strong>
                <p>
                  Thông báo đăng ký hội viên và sự kiện sẽ xuất hiện tại đây.
                </p>
              </div>
            )}
            {items.map((item) => (
              <Link
                key={item.id}
                className={
                  "registration-bell-item" +
                  (!readIds.includes(item.id) ? " is-unread" : "")
                }
                href={
                  item.href +
                  (item.eventId
                    ? "?eventId=" + encodeURIComponent(item.eventId)
                    : "?registrationId=" +
                      encodeURIComponent(item.registrationId || ""))
                }
                onClick={() => {
                  markRead(item.id);
                  setOpen(false);
                }}
              >
                <span className="registration-bell-icon">
                  <ClipboardList size={20} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <small>
                    <span className={"registration-bell-status " + item.status}>
                      {labels[item.status]}
                    </span>
                    <time>
                      {new Date(item.createdAt).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </small>
                </div>
                {!readIds.includes(item.id) && (
                  <i className="registration-bell-dot" />
                )}
              </Link>
            ))}
          </div>
          <Link
            className="registration-bell-footer"
            href="/admin/registrations"
            onClick={() => setOpen(false)}
          >
            Xem hồ sơ đăng ký
            <ChevronRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
export default function RegistrationInbox() {
  const {
    items: allItems,
    pending,
    readIds,
    markRead,
    error,
  } = useContext(Context);
  const items = allItems.filter((item) => !item.eventId);
  const labels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    absent: "Vắng mặt",
  };
  return (
    <section
      aria-labelledby="registration-inbox-heading"
      style={{
        marginBottom: 24,
        padding: 24,
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        background: "white",
      }}
    >
      <h2 id="registration-inbox-heading">Thông báo đăng ký hội viên</h2>
      <p>{pending} hồ sơ chờ duyệt · Tự cập nhật khi ứng dụng đang mở</p>
      {error && <p role="status">{error}</p>}
      {!items.length && !error && <p>Chưa có hồ sơ đăng ký.</p>}
      <div>
        {items.map((item) => (
          <Link
            key={item.id}
            href={
              item.href +
              (item.eventId
                ? "?eventId=" + encodeURIComponent(item.eventId)
                : "?registrationId=" +
                  encodeURIComponent(item.registrationId || ""))
            }
            onClick={() => markRead(item.id)}
            style={{
              display: "block",
              padding: "16px 0",
              borderBottom: "1px solid #e2e8f0",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <strong>
              {!readIds.includes(item.id) && "● "}
              {item.title}
            </strong>
            <p>{item.description}</p>
            <small>
              {new Date(item.createdAt).toLocaleString("vi-VN")} ·{" "}
              {labels[item.status]}
            </small>
          </Link>
        ))}
      </div>
      <p>
        <Link href="/admin/registrations">Xem tất cả hồ sơ và xét duyệt</Link>
      </p>
    </section>
  );
}

export function useEventInbox() {
  const context = useContext(Context);
  return { ...context, items: context.items.filter((item) => item.eventId) };
}
