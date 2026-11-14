"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import ImagePicker, { readSelectedImage } from "@/components/shared/association/ImagePicker";
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
  const [gallery, setGallery] = useState(() => (place?.images ?? []).map((value, index) => ({ id: `existing-${index}`, value })));
  const [mapsLink, setMapsLink] = useState("");
  const [mapsError, setMapsError] = useState("");
  const [resolvingMap, setResolvingMap] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const value = mapsLink.trim();
    if (!value) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void localGoApi.resolveMap(value, controller.signal).then((point) => {
        if (controller.signal.aborted) return;
        setCoordinates(point);
        setMapVersion((version) => version + 1);
        setMapsError("");
      }).catch((cause) => {
        if (!controller.signal.aborted) setMapsError(cause instanceof Error ? cause.message : "Không lấy được vị trí từ Google Maps.");
      }).finally(() => { if (!controller.signal.aborted) setResolvingMap(false); });
    }, 650);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [mapsLink]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      if (resolvingMap) throw new Error("Vui lòng chờ lấy vị trí từ Google Maps.");
      if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude) || Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180) throw new Error("Vui lòng dán link Google Maps có vị trí cụ thể hoặc chọn một điểm trên bản đồ.");
      for (const key of ["name", "description", "address", "content"]) {
        if (/[<>]/.test(text(key))) throw new Error("Nội dung chỉ hỗ trợ văn bản thuần, không chứa dấu < hoặc >.");
      }
      for (const key of ["name", "description", "address", "category"]) {
        if (!text(key)) throw new Error("Vui lòng nhập đầy đủ các trường bắt buộc.");
      }
      const coverImage = await readSelectedImage(form, "coverImage");
      if (!coverImage) throw new Error("Vui lòng chọn ảnh bìa từ máy tính.");
      const images: string[] = [];
      for (const item of gallery) {
        const image = await readSelectedImage(form, `gallery-${item.id}`);
        if (image) images.push(image);
      }
      const body: PlaceInput = {
        name: text("name"), category: text("category"), description: text("description"), content: text("content"), address: text("address"), phone: text("phone"), website: text("website"), zalo: text("zalo"),
        coverImage, images, openingHours: hours,
        location: { type: "Point", coordinates: [coordinates.longitude, coordinates.latitude] },
      };
      if (new TextEncoder().encode(JSON.stringify(body)).byteLength > 3 * 1024 * 1024)
        throw new Error("Tổng dung lượng ảnh sau khi thu nhỏ vượt quá 3 MB. Vui lòng chọn ít ảnh hơn hoặc dùng ảnh nhỏ hơn.");
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
          <div className="form-field full-width"><span>Ảnh bìa *</span><ImagePicker name="coverImage" value={place?.coverImage ?? ""} required /></div>
          <div className={`full-width ${styles.coordinates}`}><strong>Ảnh bổ sung ({gallery.length}/10)</strong>
            {gallery.map((item, index) => <div key={item.id} className={styles.galleryItem}><span>Ảnh {index + 1}</span><ImagePicker name={`gallery-${item.id}`} value={item.value} /><button type="button" className="button button-secondary" onClick={() => setGallery(gallery.filter((row) => row.id !== item.id))}>Xóa ảnh {index + 1}</button></div>)}
            <button type="button" className="button button-secondary" disabled={gallery.length >= 10} onClick={() => setGallery([...gallery, { id: crypto.randomUUID(), value: "" }])}><Plus size={17} />Thêm ảnh bổ sung</button>
          </div>
          <label className="form-field full-width"><span>Link Google Maps</span><input type="url" value={mapsLink} maxLength={8192} placeholder="https://maps.app.goo.gl/… hoặc https://www.google.com/maps/…" onChange={(event) => {
            setMapsLink(event.target.value);
            setMapsError("");
            setResolvingMap(!!event.target.value.trim());
            if (event.target.value.trim()) setCoordinates(null);
          }} /><small>Dán link chia sẻ vị trí, bản đồ sẽ tự đặt ghim.</small></label>
          {resolvingMap && <p className="full-width" role="status">Đang lấy vị trí từ Google Maps…</p>}
          {mapsError && <p className="error-message full-width" role="alert">{mapsError}</p>}
          <div className="full-width"><CoordinatePicker key={mapVersion} value={coordinates} onChange={(point) => { setCoordinates(point); setMapsError(""); }} disabled={saving || resolvingMap} /></div>
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
      <div className="dialog-footer"><button type="button" className="button button-secondary" disabled={saving} onClick={onClose}>Hủy</button><button className="button button-primary" disabled={saving || resolvingMap}>{saving ? "Đang lưu…" : "Lưu địa điểm"}</button></div>
    </form>
  </dialog>;
}
