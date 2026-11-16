"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ImagePicker, {
  readSelectedImage,
} from "@/components/shared/association/ImagePicker";
import {
  partnerApi as api,
  type Partner,
  type Contribution,
  type PartnerPayload,
  type ContributionPayload,
} from "@/services/api/partnerApi";
import styles from "./partners.module.css";
import PartnerReferencePicker from "./PartnerReferencePicker";
export default function PartnerEditor({
  partner,
  contribution,
  mode,
  onClose,
  onSaved,
}: {
  partner?: Partner;
  contribution?: Contribution;
  mode: "partner" | "contribution";
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [kind, setKind] = useState(contribution?.type || "money");
  const [published, setPublished] = useState(
    (mode === "partner" ? partner : contribution)?.isPublished || false,
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) || "").trim();
    const number = (key: string) =>
      text(key) === "" ? null : Number(text(key));
    setBusy(true);
    setError("");
    try {
      if (mode === "partner") {
        const payload: PartnerPayload = {
          name: text("name"),
          logo: await readSelectedImage(form, "logo"),
          industry: text("industry"),
          description: text("description"),
          address: text("address"),
          website: text("website"),
          memberId: text("memberId") || null,
          isPublished: published,
        };
        if (partner) await api.update(partner.id, payload);
        else await api.create(payload, requestId.current);
      } else {
        const images = [];
        for (let i = 0; i < 3; i++) {
          const value = await readSelectedImage(form, "image" + i, {
            maxEdge: 1000,
          });
          if (value) images.push(value);
        }
        const payload: ContributionPayload = {
          title: text("title"),
          type: kind,
          paymentMethod:
            kind === "money"
              ? (text("paymentMethod") as "cash" | "bank_transfer")
              : null,
          amount: kind === "money" ? number("amount") : null,
          itemName: kind === "in_kind" ? text("itemName") : "",
          quantity: kind === "in_kind" ? number("quantity") : null,
          estimatedValue: kind === "in_kind" ? number("estimatedValue") : null,
          contributionDate: text("contributionDate"),
          description: text("description"),
          eventId: text("eventId") || null,
          images,
          isPublished: published,
          sendNotification: form.get("sendNotification") === "on",
        };
        if (contribution)
          await api.updateContribution(contribution.id, payload);
        else
          await api.createContribution(partner!.id, payload, requestId.current);
      }
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được dữ liệu.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="record-dialog"
      aria-labelledby="partner-editor-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={save}>
        <div className="dialog-header">
          <h2 id="partner-editor-title">
            {mode === "partner"
              ? partner
                ? "Sửa đơn vị"
                : "Thêm đơn vị đồng hành"
              : contribution
                ? "Sửa khoản đóng góp"
                : "Thêm khoản đóng góp"}
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="dialog-body">
          <fieldset className={styles.fields} disabled={busy}>
            {mode === "partner" ? (
              <>
                <label className="form-field">
                  <span>Tên đơn vị *</span>
                  <input
                    name="name"
                    required
                    maxLength={250}
                    defaultValue={partner?.name}
                  />
                </label>
                <div className="form-field">
                  <span>Logo</span>
                  <ImagePicker name="logo" value={partner?.logo || ""} />
                </div>
                <label className="form-field">
                  <span>Lĩnh vực</span>
                  <input
                    name="industry"
                    maxLength={250}
                    defaultValue={partner?.industry}
                  />
                </label>
                <label className="form-field">
                  <span>Giới thiệu</span>
                  <textarea
                    name="description"
                    maxLength={5000}
                    rows={4}
                    defaultValue={partner?.description}
                  />
                </label>
                <label className="form-field">
                  <span>Địa chỉ</span>
                  <input
                    name="address"
                    maxLength={500}
                    defaultValue={partner?.address}
                  />
                </label>
                <label className="form-field">
                  <span>Website (HTTP/HTTPS)</span>
                  <input
                    name="website"
                    type="url"
                    defaultValue={partner?.website}
                  />
                </label>
                <PartnerReferencePicker
                  name="memberId"
                  resource="members"
                  value={partner?.memberId || ""}
                  label="Hội viên liên kết (tùy chọn)"
                />
              </>
            ) : (
              <>
                <p>
                  Đơn vị: <strong>{partner?.name}</strong>
                </p>
                <label className="form-field">
                  <span>Tên khoản tài trợ *</span>
                  <input
                    name="title"
                    required
                    maxLength={250}
                    defaultValue={contribution?.title}
                  />
                </label>
                <label className="form-field">
                  <span>Loại đóng góp</span>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as typeof kind)}
                  >
                    <option value="money">Bằng tiền</option>
                    <option value="in_kind">Hiện vật</option>
                  </select>
                </label>
                {kind === "money" ? (
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Hình thức *</span>
                      <select
                        name="paymentMethod"
                        defaultValue={
                          contribution?.paymentMethod || "bank_transfer"
                        }
                      >
                        <option value="bank_transfer">Chuyển khoản</option>
                        <option value="cash">Tiền mặt</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Số tiền VNĐ *</span>
                      <input
                        name="amount"
                        type="number"
                        min={0}
                        max={1000000000000}
                        step={1}
                        required
                        defaultValue={contribution?.amount ?? ""}
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <label className="form-field">
                      <span>Tên hiện vật *</span>
                      <input
                        name="itemName"
                        required
                        maxLength={250}
                        defaultValue={contribution?.itemName}
                      />
                    </label>
                    <div className="form-grid">
                      <label className="form-field">
                        <span>Số lượng *</span>
                        <input
                          name="quantity"
                          type="number"
                          min={0.000001}
                          step="any"
                          required
                          defaultValue={contribution?.quantity ?? ""}
                        />
                      </label>
                      <label className="form-field">
                        <span>Giá trị ước tính VNĐ</span>
                        <input
                          name="estimatedValue"
                          type="number"
                          min={0}
                          max={1000000000000}
                          step={1}
                          defaultValue={contribution?.estimatedValue ?? ""}
                        />
                      </label>
                    </div>
                  </>
                )}
                <label className="form-field">
                  <span>Ngày đóng góp *</span>
                  <input
                    name="contributionDate"
                    type="date"
                    required
                    defaultValue={contribution?.contributionDate}
                  />
                </label>
                <label className="form-field">
                  <span>Mô tả *</span>
                  <textarea
                    name="description"
                    required
                    maxLength={5000}
                    rows={4}
                    defaultValue={contribution?.description}
                  />
                </label>
                <PartnerReferencePicker
                  name="eventId"
                  resource="events"
                  value={contribution?.eventId || ""}
                  label="Chương trình/sự kiện (tùy chọn)"
                />
                <p className={styles.hint}>
                  Chỉ chọn ảnh được phép công khai. Ảnh đã tải lên có thể truy
                  cập qua đường dẫn; không tải chứng từ chứa thông tin nhạy cảm.
                </p>
                {[0, 1, 2].map((i) => (
                  <div className="form-field" key={i}>
                    <span>Ảnh công khai {i + 1} (tùy chọn)</span>
                    <ImagePicker
                      name={"image" + i}
                      value={contribution?.images[i] || ""}
                    />
                  </div>
                ))}
              </>
            )}
            <label>
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />{" "}
              Công khai trên Mini App
            </label>
            {mode === "contribution" && (
              <label>
                <input
                  name="sendNotification"
                  type="checkbox"
                  disabled={
                    !published ||
                    !partner?.isPublished ||
                    contribution?.notification?.status === "sent"
                  }
                />{" "}
                Gửi thông báo nội bộ{" "}
                {contribution?.notification?.status === "sent"
                  ? "(đã gửi)"
                  : ""}
              </label>
            )}
            {mode === "contribution" && !partner?.isPublished && (
              <p className={styles.hint}>
                Công bố đơn vị trước khi gửi thông báo.
              </p>
            )}
          </fieldset>
          {error && (
            <p className="error-message" role="alert">
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
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
