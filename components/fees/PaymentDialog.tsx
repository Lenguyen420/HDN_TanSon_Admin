"use client";
import FeeProofPreview from "./FeeProofPreview";
import { readSelectedImage } from "@/components/shared/association/ImagePicker";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  membershipFeeApi as api,
  feeMoney,
  type FeeDue,
  type FeePayment,
} from "@/services/api/membershipFeeApi";
export default function PaymentDialog({
  due,
  payment,
  action,
  onClose,
  onSaved,
}: {
  due: FeeDue;
  payment?: FeePayment;
  action: "manual" | "confirm" | "reject";
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const title =
    action === "manual"
      ? "Ghi nhận thu thủ công"
      : action === "confirm"
        ? "Xác nhận đã nhận đủ tiền"
        : "Từ chối minh chứng";
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      if (action === "manual")
        await api.manual(due.id, {
          proofImage:
            (await readSelectedImage(form, "proofImage", {
              maxBytes: 1024 * 1024,
            })) || undefined,
          method: String(form.get("method")),

          note: String(form.get("note")),
        });
      else await api.decide(payment!.id, action, String(form.get("note")));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xử lý được thanh toán.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="record-dialog"
      aria-labelledby="fee-payment-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={save}>
        <div className="dialog-header">
          <h2 id="fee-payment-title">{title}</h2>
        </div>
        <div className="dialog-body">
          <p>
            {due.member.name} · {feeMoney(due.amountDue)}
          </p>
          {payment && (
            <>
              <p>{payment.note}</p>
              <FeeProofPreview payment={payment} />
            </>
          )}
          {action === "manual" && (
            <>
              <label className="form-field">
                <span>Phương thức</span>
                <select name="method" disabled={busy}>
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                </select>
              </label>
              <label className="form-field">
                <span>Ảnh chứng từ từ thiết bị (tùy chọn)</span>
                <input
                  type="file"
                  name="proofImage:file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                />
              </label>
            </>
          )}
          <label className="form-field">
            <span>
              {action === "reject" ? "Lý do từ chối *" : "Ghi chú đối soát"}
            </span>
            <textarea
              name="note"
              maxLength={2000}
              required={action === "reject"}
              disabled={busy}
            />
          </label>
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
          <button className="button button-primary" disabled={busy}>
            {busy ? "Đang xử lý…" : title}
          </button>
        </div>
      </form>
    </dialog>
  );
}
