"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Users,
  XCircle,
} from "lucide-react";
import api from "@/services/api/axiosConfig";

interface Participant {
  id: string;
  name: string;
  company: string;
  registeredAt: string | null;
  checkedAt: string | null;
  status: "registered" | "attended" | "absent";
}
const PAGE_SIZE = 50;
const statuses = {
  registered: { label: "Đã đăng ký", icon: Clock3 },
  attended: { label: "Đã điểm danh", icon: CheckCircle2 },
  absent: { label: "Vắng mặt", icon: XCircle },
};
function ParticipantTime({
  value,
  empty = "—",
}: {
  value: string | null;
  empty?: string;
}) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime()))
    return <span className="participation-muted">{empty}</span>;
  return (
    <time dateTime={value!} className="participation-time">
      <span>
        {date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
      </span>
      <small>
        {date.toLocaleTimeString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </small>
    </time>
  );
}

export default function EventParticipationList({
  eventId,
}: {
  eventId: string;
}) {
  const [items, setItems] = useState<Participant[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true,
      busy = false;
    const controller = new AbortController();
    const refresh = async (initial = false) => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      if (initial) {
        setLoading(true);
        setItems([]);
      }
      try {
        const { data } = await api.get<{
          data: Participant[];
          pagination: { total: number };
        }>(
          "/association/events/" + encodeURIComponent(eventId) + "/attendance",
          { params: { page, limit: PAGE_SIZE }, signal: controller.signal },
        );
        if (active) {
          setItems(data.data);
          setTotal(data.pagination.total);
          setError("");
        }
      } catch {
        if (active)
          setError("Chưa tải được danh sách tham gia. Hệ thống sẽ tự thử lại.");
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [eventId, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <section
      className="participation-panel"
      aria-label="Người tham gia sự kiện"
    >
      <div className="participation-header">
        <div className="participation-heading">
          <span className="participation-heading-icon">
            <Users size={21} aria-hidden="true" />
          </span>
          <div>
            <h3>
              Đăng ký và điểm danh{" "}
              <span className="participation-count">{total}</span>
            </h3>
            <p>Danh sách người tham gia · Giờ Việt Nam</p>
          </div>
        </div>
        <span className="participation-live">
          <span aria-hidden="true" /> Tự động cập nhật
        </span>
      </div>
      {error && (
        <p className="participation-error" role="status">
          {error}
        </p>
      )}
      <div
        className="participation-table-wrap"
        role="region"
        aria-label="Bảng đăng ký và điểm danh"
        tabIndex={0}
      >
        <table className="participation-table" aria-busy={loading}>
          <caption className="sr-only">
            Người đăng ký và điểm danh sự kiện, gồm họ tên, đơn vị, trạng thái
            và thời gian tham gia.
          </caption>
          <thead>
            <tr>
              <th scope="col">STT</th>
              <th scope="col">Họ và tên</th>
              <th scope="col">Đơn vị</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Đăng ký lúc</th>
              <th scope="col">Điểm danh lúc</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="participation-empty" role="status">
                    <LoaderCircle size={22} className="animate-spin" />
                    <p>Đang tải danh sách…</p>
                  </div>
                </td>
              </tr>
            ) : items.length ? (
              items.map((item, index) => {
                const status = statuses[item.status] ?? statuses.registered;
                const Icon = status.icon;
                const initials = item.name
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((word) => word[0])
                  .join("")
                  .toLocaleUpperCase("vi");
                return (
                  <tr key={item.id}>
                    <td className="participation-number">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <th scope="row">
                      <div className="participation-person">
                        <span
                          className="participation-avatar"
                          aria-hidden="true"
                        >
                          {initials || "?"}
                        </span>
                        <span>{item.name || "Chưa có tên"}</span>
                      </div>
                    </th>
                    <td className="participation-company">
                      {item.company || (
                        <span className="participation-muted">
                          Chưa cập nhật
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`participation-status participation-status-${item.status}`}
                      >
                        <Icon size={14} aria-hidden="true" />
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <ParticipantTime value={item.registeredAt} />
                    </td>
                    <td>
                      <ParticipantTime
                        value={item.checkedAt}
                        empty="Chưa điểm danh"
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="participation-empty">
                    <Users size={28} />
                    <p>
                      {error
                        ? "Danh sách chưa sẵn sàng."
                        : "Chưa có người đăng ký hoặc điểm danh."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="participation-pagination">
        <span>
          {total && items.length
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min((page - 1) * PAGE_SIZE + items.length, total)} trong ${total} người`
            : `${total} người tham gia`}
        </span>
        <div>
          <button
            type="button"
            className="button button-secondary"
            disabled={loading || page === 1}
            onClick={() => setPage((current) => current - 1)}
            aria-label="Trang trước danh sách tham gia"
          >
            <ChevronLeft size={16} /> Trước
          </button>
          <span className="participation-page">
            Trang <strong>{page}</strong> / {pages}
          </span>
          <button
            type="button"
            className="button button-secondary"
            disabled={loading || page >= pages}
            onClick={() => setPage((current) => current + 1)}
            aria-label="Trang sau danh sách tham gia"
          >
            Sau <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
