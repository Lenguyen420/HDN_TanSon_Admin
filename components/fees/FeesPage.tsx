"use client";
import { useEffect, useState } from "react";
import { CircleStop, Eye, Pencil, Send } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import {
  membershipFeeApi as api,
  feeDate,
  feeMoney,
  feeLabels,
  type FeeCampaign,
} from "@/services/api/membershipFeeApi";
import CampaignEditor from "./CampaignEditor";
import CampaignDues from "./CampaignDues";
import styles from "./fees.module.css";
export default function FeesPage() {
  const [rows, setRows] = useState<FeeCampaign[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1);
  const [search, setSearch] = useState(""),
    [year, setYear] = useState(""),
    [status, setStatus] = useState("");
  const [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [editor, setEditor] = useState<{ campaign?: FeeCampaign }>(),
    [selected, setSelected] = useState<FeeCampaign>();
  const [closing, setClosing] = useState<FeeCampaign>();
  const refresh = () => {
    setLoading(true);
    setRevision((n) => n + 1);
  };
  useEffect(() => {
    const c = new AbortController();
    const timer = setTimeout(() => {
      const params: Record<string, string | number> = {
        page,
        limit: 20,
        search,
      };
      if (year) params.year = year;
      if (status) params.status = status;
      void api
        .list(params, c.signal)
        .then((r) => {
          if (!c.signal.aborted) {
            setRows(r.data);
            setTotal(r.pagination.total);
            setError("");
          }
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [page, search, year, status, revision]);
  async function act(campaign: FeeCampaign, close = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (close) await api.update(campaign.id, { status: "closed" });
      else await api.publish(campaign.id);
      setClosing(undefined);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xử lý được đợt thu.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell activeHref="/admin/fees">
      <div className={styles.page}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>QUẢN LÝ HỘI VIÊN</span>
            <h1>Theo dõi hội phí</h1>
            <p>
              Quản lý đợt thu, đối soát chuyển khoản và tình trạng đóng phí.
            </p>
          </div>
          {!selected && (
            <button
              className="button button-primary"
              onClick={() => setEditor({})}
            >
              + Tạo đợt thu
            </button>
          )}
        </div>
        {selected ? (
          <CampaignDues
            key={selected.id}
            campaign={selected}
            onBack={() => setSelected(undefined)}
            onChanged={refresh}
          />
        ) : (
          <section className={styles.workspace}>
            <div className={styles.toolbar}>
              <label>
                Tìm đợt thu
                <input
                  aria-label="Tên hội phí"
                  value={search}
                  placeholder="Nhập tên hội phí…"
                  maxLength={150}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    setLoading(true);
                  }}
                />
              </label>
              <label>
                Năm
                <input
                  aria-label="Năm hội phí"
                  type="number"
                  min={2000}
                  max={2200}
                  placeholder="Tất cả"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setPage(1);
                    setLoading(true);
                  }}
                />
              </label>
              <label>
                Trạng thái
                <select
                  aria-label="Trạng thái đợt thu"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                    setLoading(true);
                  }}
                >
                  <option value="">Tất cả</option>
                  {["draft", "published", "closed"].map((s) => (
                    <option value={s} key={s}>
                      {feeLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-secondary" onClick={refresh}>
                Làm mới
              </button>
            </div>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            {closing && (
              <div className={styles.warning}>
                <p>
                  Ngừng thu “{closing.title}”? Các khoản chưa đóng và đang chờ
                  xác nhận sẽ bị hủy. Khoản đã đóng được giữ lại.
                </p>
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => setClosing(undefined)}
                >
                  Quay lại
                </button>{" "}
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => void act(closing, true)}
                >
                  Xác nhận ngừng thu
                </button>
              </div>
            )}
            {loading ? (
              <p role="status">Đang tải đợt hội phí…</p>
            ) : (
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {[
                        "Đợt hội phí",
                        "Số tiền",
                        "Hạn đóng",
                        "Đối tượng",
                        "Hội viên",
                        "Đã đóng",
                        "Chưa đóng / chờ",
                        "Quá hạn",
                        "Trạng thái",
                        "Thao tác",
                      ].map((s) => (
                        <th
                          key={s}
                          className={
                            s === "Thao tác" ? "action-heading" : undefined
                          }
                        >
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <button
                            className="record-title"
                            onClick={() => setSelected(c)}
                          >
                            {c.title}
                          </button>
                          <small>{c.year}</small>
                        </td>
                        <td>{feeMoney(c.amount)}</td>
                        <td>{feeDate(c.dueDate)}</td>
                        <td>
                          {c.target === "all"
                            ? "Tất cả đang hoạt động"
                            : "Hội viên được chọn"}
                        </td>
                        <td>{c.summary?.total || 0}</td>
                        <td>{c.summary?.paid || 0}</td>
                        <td>
                          {(c.summary?.unpaid || 0) +
                            (c.summary?.pending_confirmation || 0)}
                        </td>
                        <td>{c.summary?.overdue || 0}</td>
                        <td>
                          <span className={styles.badge}>
                            {feeLabels[c.status]}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-button"
                              title="Xem chi tiết"
                              aria-label={`Xem ${c.title}`}
                              onClick={() => setSelected(c)}
                            >
                              <Eye size={16} />
                            </button>
                            {c.status !== "closed" && (
                              <button
                                type="button"
                                className="icon-button"
                                title="Chỉnh sửa"
                                aria-label={`Sửa ${c.title}`}
                                disabled={busy}
                                onClick={() => setEditor({ campaign: c })}
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {c.status === "draft" && (
                              <button
                                type="button"
                                className="icon-button approve-button"
                                title="Công bố đợt thu"
                                aria-label={`Công bố ${c.title}`}
                                disabled={busy}
                                onClick={() => void act(c)}
                              >
                                <Send size={16} />
                              </button>
                            )}
                            {c.status === "published" && (
                              <button
                                type="button"
                                className="icon-button danger-button"
                                title="Ngừng thu"
                                aria-label={`Ngừng thu ${c.title}`}
                                disabled={busy}
                                onClick={() => setClosing(c)}
                              >
                                <CircleStop size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <div className={styles.empty}>
                    <h3>Chưa có đợt hội phí</h3>
                    <p>Tạo đợt thu để bắt đầu theo dõi hội phí của hội viên.</p>
                  </div>
                )}
              </div>
            )}
            <div className={styles.toolbar}>
              <span>{total} đợt thu</span>
              <div className={styles.actions}>
                <button
                  disabled={page === 1 || loading}
                  onClick={() => {
                    setPage((n) => n - 1);
                    setLoading(true);
                  }}
                >
                  Trước
                </button>
                <span>Trang {page}</span>
                <button
                  disabled={page * 20 >= total || loading}
                  onClick={() => {
                    setPage((n) => n + 1);
                    setLoading(true);
                  }}
                >
                  Sau
                </button>
              </div>
            </div>
          </section>
        )}
        {editor && (
          <CampaignEditor
            campaign={editor.campaign}
            onClose={() => setEditor(undefined)}
            onSaved={refresh}
          />
        )}
      </div>
    </AppShell>
  );
}
