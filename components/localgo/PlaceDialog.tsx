"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { localGoApi } from "@/services/api/localGoApi";
import { notify } from "@/lib/notify";
import CoordinatePicker from "./CoordinatePicker";
import type { Coordinates, LocalGoCategory, LocalGoPlace, PlaceInput } from "./types";
import styles from "./localgo.module.css";

const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
export default function PlaceDialog({ place, categories, onClose, onSaved }: {
  place: LocalGoPlace | null;
  categories: LocalGoCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(place ? { longitude: place.location.coordinates[0], latitude: place.location.coordinates[1] } : null);
  const [hours, setHours] = useState(place?.openingHours ?? []);
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    setError("");
    try {
      if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude) || Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180) throw new Error("Vui lòng chọn tọa độ hợp lệ trên bản đồ hoặc nhập tọa độ.");
      for (const key of ["name", "description", "address", "content"]) {
        if (/[<>]/.test(text(key))) throw new Error("Nội dung chỉ hỗ trợ văn bản thuần, không chứa dấu < hoặc >.");
      }
      for (const key of ["name", "description", "address", "category", "coverImage"]) {
        if (!text(key)) throw new Error("Vui lòng nhập đầy đủ các trường bắt buộc.");
      }
      const images = text("images").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (images.length > 10) throw new Error("Chỉ được nhập tối đa 10 ảnh bổ sung.");
      for (const source of [text("coverImage"), ...images]) {
        if (/^\/?uploads\/[a-z0-9/-]+\.(jpg|png|webp)$/i.test(source)) continue;
        const url = new URL(source);
        if (source.length > 2048 || !["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Ảnh phải là URL HTTP(S) hoặc đường dẫn uploads hợp lệ.");
      }
      const body: PlaceInput = {
        name: text("name"), category: text("category"), description: text("description"), content: text("content"), address: text("address"), phone: text("phone"), website: text("website"), zalo: text("zalo"),
        coverImage: text("coverImage"), images, openingHours: hours,
        location: { type: "Point", coordinates: [coordinates.longitude, coordinates.latitude] },
      };
      savingRef.current = true;
      setSaving(true);
      await localGoApi.save(place?.id ?? null, body);
      notify.success(place ? "Đã cập nhật địa điểm." : "Đã thêm địa điểm.");
      onSaved();
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Không thể lưu địa điểm.";
      setError(message);
      notify.error(message);
    } finally { savingRef.current = false; setSaving(false); }
  }
  return <dialog ref={dialog} className="record-dialog" aria-labelledby="localgo-place-title" onCancel={(event) => { if (savingRef.current) event.preventDefault(); else onClose(); }}>
    <form onSubmit={submit}>
      <div className="dialog-header"><h2 id="localgo-place-title">{place ? "Chỉnh sửa địa điểm" : "Thêm địa điểm"}</h2><button type="button" className="icon-button" aria-label="Đóng biểu mẫu" disabled={saving} onClick={onClose}><X size={20} /></button></div>
      <div className="dialog-body">
        <fieldset disabled={saving} className="form-grid record-fields">
          <label className="form-field"><span>Tên địa điểm *</span><input autoFocus name="name" required maxLength={200} defaultValue={place?.name} /></label>
          <label className="form-field"><span>Danh mục *</span><select name="category" required defaultValue={place?.category ?? ""}><option value="">Chọn danh mục</option>{categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          <label className="form-field full-width"><span>Địa chỉ *</span><input name="address" required maxLength={500} defaultValue={place?.address} /></label>
          <label className="form-field full-width"><span>Mô tả ngắn *</span><textarea name="description" required maxLength={1000} rows={3} defaultValue={place?.description} /></label>
          <label className="form-field full-width"><span>Nội dung chi tiết</span><textarea name="content" maxLength={20000} rows={5} defaultValue={place?.content} /></label>
          <label className="form-field"><span>Điện thoại</span><input name="phone" type="tel" maxLength={30} pattern={String.raw`\+?[0-9\(\). \-]{7,30}`} defaultValue={place?.phone} /></label>
          <label className="form-field"><span>Website</span><input name="website" type="url" maxLength={2048} defaultValue={place?.website} /></label>
          <label className="form-field full-width"><span>Liên kết Zalo</span><input name="zalo" type="url" maxLength={2048} defaultValue={place?.zalo} /></label>
          <label className="form-field full-width"><span>Đường dẫn ảnh bìa *</span><input name="coverImage" required maxLength={2048} defaultValue={place?.coverImage} placeholder="https://… hoặc uploads/…" /><small>Nhập URL ảnh có sẵn.</small></label>
          <label className="form-field full-width"><span>Ảnh bổ sung (tối đa 10, mỗi dòng một đường dẫn)</span><textarea name="images" rows={3} defaultValue={place?.images?.join("\n")} /></label>
          <div className="full-width"><CoordinatePicker value={coordinates} onChange={setCoordinates} disabled={saving} /></div>
          <div className={`full-width ${styles.coordinates}`}><strong>Giờ mở cửa</strong>
            {hours.map((row, index) => <div className={styles.actions} key={index}>
              <label className="form-field"><span>Ngày</span><select aria-label={`Ngày khung giờ ${index + 1}`} value={row.day} onChange={(event) => setHours(hours.map((item, i) => i === index ? { ...item, day: Number(event.target.value) } : item))}>{days.map((day, i) => <option key={day} value={i}>{day}</option>)}</select></label>
              <label className="form-field"><span>Mở cửa</span><input aria-label={`Giờ mở cửa ${index + 1}`} type="time" required value={row.open} onChange={(event) => setHours(hours.map((item, i) => i === index ? { ...item, open: event.target.value } : item))} /></label>
              <label className="form-field"><span>Đóng cửa</span><input aria-label={`Giờ đóng cửa ${index + 1}`} type="time" required value={row.close} onChange={(event) => setHours(hours.map((item, i) => i === index ? { ...item, close: event.target.value } : item))} /></label>
              <button type="button" className="icon-button" aria-label={`Xóa khung giờ ${index + 1}`} onClick={() => setHours(hours.filter((_, i) => i !== index))}><X size={18} /></button>
            </div>)}
            <button type="button" className="button button-secondary" disabled={hours.length >= 21} onClick={() => setHours([...hours, { day: 1, open: "08:00", close: "17:00" }])}>Thêm khung giờ</button>
          </div>
        </fieldset>
        {error && <p role="alert" className="error-message">{error}</p>}
      </div>
      <div className="dialog-footer"><button type="button" className="button button-secondary" disabled={saving} onClick={onClose}>Hủy</button><button className="button button-primary" disabled={saving}>{saving ? "Đang lưu…" : "Lưu địa điểm"}</button></div>
    </form>
  </dialog>;
}
