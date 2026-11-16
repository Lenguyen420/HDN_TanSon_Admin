"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  membershipFeeApi as api,
  type FeeCampaign,
  type FeePayload,
} from "@/services/api/membershipFeeApi";
import styles from "./fees.module.css";
export default function CampaignEditor({
  campaign,
  onClose,
  onSaved,
}: {
  campaign?: FeeCampaign;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState(campaign?.targetMemberIds || []);
  const [target, setTarget] = useState(campaign?.target || "all");
  const [memberError, setMemberError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const locked = campaign && campaign.status !== "draft";
  useEffect(() => {
    dialog.current?.showModal();
    const controller = new AbortController();
    void api
      .members(controller.signal)
      .then(setMembers)
      .catch((e) => {
        if (!controller.signal.aborted) setMemberError(e.message);
      });
    return () => controller.abort();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const payload: FeePayload = {
      title: String(form.get("title")).trim(),
      year: Number(form.get("year")),
      amount: Number(form.get("amount")),
      dueDate: String(form.get("dueDate")),
      description: String(form.get("description")),
      paymentInstructions: String(form.get("paymentInstructions")),
      target,
      targetMemberIds: selected,
      status: String(form.get("status") || "draft") as "draft" | "published",
    };
    setBusy(true);
    setError("");
    try {
      if (campaign)
        await api.update(
          campaign.id,
          locked
            ? {
                title: payload.title,
                description: payload.description,
                dueDate: payload.dueDate,
                paymentInstructions: payload.paymentInstructions,
              }
            : { ...payload, status: "draft" },
        );
      else await api.create(payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được đợt thu.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="record-dialog"
      aria-labelledby="fee-editor-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={save}>
        <div className="dialog-header">
          <h2 id="fee-editor-title">
            {campaign ? "Sửa đợt hội phí" : "Tạo đợt hội phí"}
          </h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div className="dialog-body">
          <fieldset disabled={busy} className={styles.fields}>
            <label className="form-field">
              <span>Tên hội phí *</span>
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={campaign?.title}
              />
            </label>
            <div className="form-grid">
              <label className="form-field">
                <span>Năm *</span>
                <input
                  name="year"
                  type="number"
                  min={2000}
                  max={2200}
                  required
                  readOnly={!!locked}
                  defaultValue={campaign?.year || new Date().getFullYear()}
                />
              </label>
              <label className="form-field">
                <span>Số tiền (VND) *</span>
                <input
                  name="amount"
                  type="number"
                  min={1}
                  max={1000000000}
                  step={1}
                  required
                  readOnly={!!locked}
                  defaultValue={campaign?.amount}
                />
              </label>
            </div>
            <label className="form-field">
              <span>Hạn đóng *</span>
              <input
                name="dueDate"
                type="date"
                required
                defaultValue={campaign?.dueDate}
              />
            </label>
            <label className="form-field">
              <span>Mô tả</span>
              <textarea
                name="description"
                rows={3}
                maxLength={5000}
                defaultValue={campaign?.description}
              />
            </label>
            <label className="form-field">
              <span>Hướng dẫn chuyển khoản</span>
              <textarea
                name="paymentInstructions"
                rows={4}
                maxLength={5000}
                placeholder="Ngân hàng, số tài khoản, tên chủ tài khoản, nội dung chuyển khoản…"
                defaultValue={campaign?.paymentInstructions}
              />
            </label>
            {!locked && (
              <>
                <label className="form-field">
                  <span>Đối tượng áp dụng</span>
                  <select
                    value={target}
                    onChange={(e) =>
                      setTarget(e.target.value as "all" | "selected")
                    }
                  >
                    <option value="all">
                      Tất cả hội viên đang hoạt động khi công bố
                    </option>
                    <option value="selected">Chọn hội viên</option>
                  </select>
                </label>
                {target === "selected" && (
                  <section>
                    <p>Đã chọn {selected.length} hội viên</p>
                    {memberError ? (
                      <p role="alert">{memberError}</p>
                    ) : (
                      <>
                        <input
                          aria-label="Tìm hội viên"
                          placeholder="Tìm hội viên…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className={styles.memberList}>
                          {members
                            .filter(
                              (m) =>
                                m.name
                                  .toLocaleLowerCase("vi")
                                  .includes(search.toLocaleLowerCase("vi")) ||
                                m.id.includes(search),
                            )
                            .map((m) => (
                              <label key={m.id}>
                                <input
                                  type="checkbox"
                                  checked={selected.includes(m.id)}
                                  onChange={(e) =>
                                    setSelected((ids) =>
                                      e.target.checked
                                        ? [...ids, m.id]
                                        : ids.filter((id) => id !== m.id),
                                    )
                                  }
                                />{" "}
                                {m.name} <small>{m.id}</small>
                              </label>
                            ))}
                        </div>
                      </>
                    )}
                  </section>
                )}
                {!campaign && (
                  <label className="form-field">
                    <span>Trạng thái</span>
                    <select name="status">
                      <option value="draft">Lưu bản nháp</option>
                      <option value="published">
                        Công bố và giao khoản phải đóng
                      </option>
                    </select>
                  </label>
                )}
              </>
            )}
            {locked && <p>Số tiền và đối tượng đã được chốt khi công bố.</p>}
          </fieldset>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className="button button-primary"
            disabled={
              busy || (!locked && target === "selected" && !selected.length)
            }
          >
            {busy ? "Đang lưu…" : "Lưu đợt thu"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
