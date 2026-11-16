"use client";
import { useEffect, useState } from "react";
import { Banknote, Check, History, X } from "lucide-react";
import {
  membershipFeeApi as api,
  feeDate,
  feeMoney,
  feeLabels,
  type FeeCampaign,
  type FeeDue,
  type FeePayment,
  type FeeSummary,
} from "@/services/api/membershipFeeApi";
import PaymentDialog from "./PaymentDialog";
import styles from "./fees.module.css";
export default function CampaignDues({
  campaign,
  onBack,
  onChanged,
}: {
  campaign: FeeCampaign;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<FeeDue[]>([]),
    [summary, setSummary] = useState<FeeSummary>();
  const [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [detail, setDetail] = useState<FeeDue>();
  const [action, setAction] = useState<{
    due: FeeDue;
    payment?: FeePayment;
    action: "manual" | "confirm" | "reject";
  }>();
  useEffect(() => {
    const c = new AbortController();
    void api
      .dues(campaign.id, page, c.signal)
      .then((r) => {
        if (!c.signal.aborted) {
          setRows(r.data);
          setSummary(r.summary);
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
    return () => c.abort();
  }, [campaign.id, page, revision]);
  const refresh = () => {
    setLoading(true);
    setDetail(undefined);
    setRevision((n) => n + 1);
    onChanged();
  };
  return (
    <section className={styles.workspace}>
      <div className={styles.toolbar}>
        <button className="button button-secondary" onClick={onBack}>
          ← Các đợt thu
        </button>
        <button className="button button-secondary" onClick={refresh}>
          Làm mới
        </button>
      </div>
      <h2>
        {campaign.title} · {campaign.year}
      </h2>
      <p>
        {feeMoney(campaign.amount)} / hội viên · Hạn {feeDate(campaign.dueDate)}
      </p>
      {summary && (
        <div className={styles.stats}>
          {[
            ["Hội viên", summary.total],
            ["Đã đóng", summary.paid],
            ["Chưa đóng", summary.unpaid],
            ["Quá hạn", summary.overdue],
            ["Chờ xác nhận", summary.pending_confirmation],
            ["Đã hủy", summary.cancelled],
          ].map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải khoản phải đóng…</p>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {[
                  "Hội viên / mã",
                  "Phải đóng",
                  "Đã ghi nhận",
                  "Trạng thái",
                  "Ngày đóng",
                  "Phương thức / mã GD",
                  "Thao tác",
                ].map((t) => (
                  <th
                    key={t}
                    className={t === "Thao tác" ? "action-heading" : undefined}
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>
                    {d.member.name}
                    <small className={styles.block}>{d.memberId}</small>
                  </td>
                  <td>{feeMoney(d.amountDue)}</td>
                  <td>{feeMoney(d.paidAmount)}</td>
                  <td>{feeLabels[d.status]}</td>
                  <td>{feeDate(d.paidAt)}</td>
                  <td>
                    {d.paymentMethod === "cash"
                      ? "Tiền mặt"
                      : d.paymentMethod
                        ? "Chuyển khoản"
                        : "—"}
                    <small className={styles.block}>{d.transactionRef}</small>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Xem lịch sử"
                        aria-label={`Xem lịch sử của ${d.member.name}`}
                        aria-expanded={detail?.id === d.id}
                        onClick={() =>
                          setDetail(detail?.id === d.id ? undefined : d)
                        }
                      >
                        <History size={16} />
                      </button>
                      {d.status === "pending_confirmation" &&
                        d.payments
                          .filter((p) => p.status === "pending")
                          .map((p) => (
                            <span className="row-actions" key={p.id}>
                              <button
                                type="button"
                                className="icon-button approve-button"
                                title="Xác nhận thanh toán"
                                aria-label={`Xác nhận thanh toán của ${d.member.name}`}
                                onClick={() =>
                                  setAction({
                                    due: d,
                                    payment: p,
                                    action: "confirm",
                                  })
                                }
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                className="icon-button danger-button"
                                title="Từ chối minh chứng"
                                aria-label={`Từ chối minh chứng của ${d.member.name}`}
                                onClick={() =>
                                  setAction({
                                    due: d,
                                    payment: p,
                                    action: "reject",
                                  })
                                }
                              >
                                <X size={16} />
                              </button>
                            </span>
                          ))}
                      {campaign.status === "published" &&
                        ["unpaid", "overdue"].includes(d.status) && (
                          <button
                            type="button"
                            className="icon-button approve-button"
                            title="Ghi nhận thu thủ công"
                            aria-label={`Ghi nhận thu của ${d.member.name}`}
                            onClick={() =>
                              setAction({ due: d, action: "manual" })
                            }
                          >
                            <Banknote size={16} />
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className={styles.empty}>Chưa có khoản phải đóng.</p>
          )}
        </div>
      )}
      <div className={styles.toolbar}>
        <span>{total} hội viên</span>
        <div className={styles.actions}>
          <button
            disabled={page === 1 || loading}
            onClick={() => {
              setLoading(true);
              setPage((n) => n - 1);
            }}
          >
            Trước
          </button>
          <span>Trang {page}</span>
          <button
            disabled={page * 20 >= total || loading}
            onClick={() => {
              setLoading(true);
              setPage((n) => n + 1);
            }}
          >
            Sau
          </button>
        </div>
      </div>
      {detail && (
        <section className={styles.history}>
          <h3>Lịch sử · {detail.member.name}</h3>
          {detail.payments.map((p) => (
            <article key={p.id}>
              <strong>
                {feeLabels[p.status]} · {feeMoney(p.amount)}
              </strong>
              <p>
                {p.transactionRef} · {feeDate(p.createdAt)} · {p.note}
              </p>
              {p.proofUrl && (
                <a href={p.proofUrl} target="_blank" rel="noreferrer">
                  Xem minh chứng
                </a>
              )}
              {p.audit.map((a, i) => (
                <p key={i}>
                  {a.action} · {a.actorId} ·{" "}
                  {new Date(a.at).toLocaleString("vi-VN")} {a.note}
                </p>
              ))}
            </article>
          ))}
          <h4>Nhật ký khoản phải đóng</h4>
          {detail.audit.map((a, i) => (
            <p key={i}>
              {a.action} · {a.actorId} ·{" "}
              {new Date(a.at).toLocaleString("vi-VN")} {a.note}
            </p>
          ))}
        </section>
      )}
      {action && (
        <PaymentDialog
          {...action}
          onClose={() => setAction(undefined)}
          onSaved={refresh}
        />
      )}
    </section>
  );
}
