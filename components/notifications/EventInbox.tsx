"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createBackgroundPoller } from "@/services/background-polling";
import api from "@/services/api/axiosConfig";
import { useEventInbox } from "./RegistrationInbox";
interface EventNotice {
  id: string;
  eventId: string;
  title: string;
  description: string;
  createdAt: string;
  href: string;
}
export default function EventInbox() {
  const { readIds, markRead } = useEventInbox();
  const [items, setItems] = useState<EventNotice[]>([]);
  const [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      busy = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const { data } = await api.get<{
          data: EventNotice[];
          pagination: { total: number };
        }>("/association/event-inbox?page=" + page + "&limit=20", {
          signal: controller.signal,
        });
        if (active) {
          setItems(data.data);
          setTotal(data.pagination.total);
          setError("");
        }
      } catch {
        if (active)
          setError("Chưa tải được thông báo sự kiện. Hệ thống sẽ tự thử lại.");
      } finally {
        busy = false;
      }
    };
    const poller = createBackgroundPoller(
      refresh,
      () => document.visibilityState !== "hidden",
    );
    void poller.refresh();
    const wake = () => void poller.refresh();
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false;
      controller.abort();
      poller.stop();
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [page]);
  return (
    <section
      aria-labelledby="event-inbox-heading"
      style={{
        marginBottom: 24,
        padding: 24,
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        background: "white",
      }}
    >
      <h2 id="event-inbox-heading">Vắng mặt tại sự kiện ({total})</h2>
      <p>Người đã chọn tham gia nhưng chưa điểm danh khi sự kiện kết thúc.</p>
      {error && <p role="status">{error}</p>}
      {!items.length && !error && <p>Chưa có trường hợp vắng mặt.</p>}
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href + "?eventId=" + encodeURIComponent(item.eventId)}
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
            {new Date(item.createdAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            · Vắng mặt
          </small>
        </Link>
      ))}
      {total > 20 && (
        <div>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trang trước
          </button>
          <span> Trang {page} </span>
          <button
            type="button"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
          </button>
        </div>
      )}
    </section>
  );
}
