"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import http from "@/services/api/axiosConfig";
import { createBackgroundPoller } from "@/services/background-polling";
import styles from "@/components/sponsorships/partners.module.css";
interface Notice {
  id: string;
  title: string;
  description: string;
  partnerId: string;
  contributionId?: string;
  date: string;
  time: string;
}
export default function PartnerInbox() {
  const [items, setItems] = useState<Notice[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const poller = createBackgroundPoller(
      async () => {
        try {
          const { data } = await http.get<{
            data: Notice[];
            pagination: { total: number };
          }>("/association/notification-feed", {
            params: { source: "partners", page, limit: 10 },
            signal: controller.signal,
          });
          if (active) {
            setItems(data.data);
            setTotal(data.pagination.total);
            setError("");
          }
        } catch {
          if (active)
            setError("Chưa cập nhật được thông báo đơn vị đồng hành.");
        }
      },
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
      className={styles.panel}
      style={{ marginBottom: 24 }}
      aria-labelledby="partner-inbox-title"
    >
      <h2 id="partner-inbox-title">Thông báo đơn vị đồng hành ({total})</h2>
      <p>Thông báo giới thiệu đơn vị mới và các khoản đóng góp đã công bố.</p>
      {error && <p role="status">{error}</p>}
      {!items.length && !error && <p>Chưa có thông báo.</p>}
      {items.map((n) => (
        <Link
          className={styles.contribution}
          key={n.id}
          href={`/admin/sponsorships?partnerId=${encodeURIComponent(n.partnerId)}${n.contributionId ? "&contributionId=" + encodeURIComponent(n.contributionId) : ""}`}
        >
          <strong>{n.title}</strong>
          <span>{n.description}</span>
          <small>
            {n.date} · {n.time}
          </small>
        </Link>
      ))}
      {total > 10 && (
        <div className={styles.actions}>
          <button
            className="button button-secondary"
            disabled={page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            Trước
          </button>
          <span>Trang {page}</span>
          <button
            className="button button-secondary"
            disabled={page * 10 >= total}
            onClick={() => setPage((n) => n + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </section>
  );
}
