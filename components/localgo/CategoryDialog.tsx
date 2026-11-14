"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { localGoApi } from "@/services/api/localGoApi";
import { notify } from "@/lib/notify";
import type { LocalGoCategory } from "./types";

export default function CategoryDialog({ category, deleting = false, onClose, onSaved }: {
  category: LocalGoCategory | null;
  deleting?: boolean;
  onClose: () => void;
  onSaved: (deletedCode?: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = deleting ? "Xóa danh mục" : category ? "Sửa danh mục" : "Thêm danh mục";
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const form = new FormData(event.currentTarget);
    const code = category?.code ?? String(form.get("code") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    if (!deleting && (!name || /[<>]/.test(name))) {
      setError("Tên danh mục không được trống và chỉ hỗ trợ văn bản thuần.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (deleting && category) await localGoApi.removeCategory(category.code);
      else await localGoApi.saveCategory(category?.code ?? null, { code, name });
      notify.success(deleting ? "Đã xóa danh mục." : category ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
      onSaved(deleting ? code : undefined);
      onClose();
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Không thể lưu danh mục.";
      setError(text);
      notify.error(text);
    } finally { busyRef.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="record-dialog" aria-labelledby="localgo-category-title" onCancel={(event) => { if (busyRef.current) event.preventDefault(); else onClose(); }}>
    <form onSubmit={submit}>
      <div className="dialog-header"><h2 id="localgo-category-title">{title}</h2><button type="button" className="icon-button" aria-label="Đóng danh mục" disabled={busy} onClick={onClose}><X size={20} /></button></div>
      <div className="dialog-body">
        {deleting ? <><p>Xóa danh mục “{category?.name}”?</p><p>Chỉ xóa được danh mục không còn địa điểm sử dụng.</p></> : <fieldset className="form-grid record-fields" disabled={busy}>
          <label className="form-field"><span>Mã danh mục *</span><input autoFocus={!category} name="code" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={category?.code} readOnly={!!category} /><small>Dùng chữ thường không dấu, số và dấu gạch ngang. Mã không thay đổi sau khi tạo.</small></label>
          <label className="form-field"><span>Tên danh mục *</span><input autoFocus={!!category} name="name" required maxLength={120} defaultValue={category?.name} /></label>
        </fieldset>}
        {error && <p role="alert" className="error-message">{error}</p>}
      </div>
      <div className="dialog-footer"><button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>Hủy</button><button className="button button-primary" disabled={busy}>{busy ? "Đang xử lý…" : deleting ? "Xóa danh mục" : "Lưu danh mục"}</button></div>
    </form>
  </dialog>;
}
