"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MemberAvatar from "@/components/shared/association/MemberAvatar";
import { localGoApi } from "@/services/api/localGoApi";
import { notify } from "@/lib/notify";
import PlaceDialog from "./PlaceDialog";
import type { LocalGoCategory, LocalGoMember, LocalGoPlace } from "./types";
import styles from "./localgo.module.css";

const message = (cause: unknown) => cause instanceof Error ? cause.message : "Không thể thực hiện yêu cầu.";
const limit = 20;

function MemberDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [member, setMember] = useState<LocalGoMember>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    void localGoApi.member(id, controller.signal).then((data) => {
      if (!controller.signal.aborted) { setMember(data); setError(""); }
    }).catch((cause) => { if (!controller.signal.aborted) setError(message(cause)); });
    return () => controller.abort();
  }, [id, revision]);
  return <dialog ref={dialog} className="record-dialog" aria-labelledby="localgo-member-title" onCancel={onClose}>
    <div className="dialog-header"><h2 id="localgo-member-title">Hội viên đăng địa điểm</h2><button className="icon-button" aria-label="Đóng thông tin hội viên" onClick={onClose}><X size={20} /></button></div>
    <div className="dialog-body">
      {error ? <><p role="alert" className="error-message">{error}</p><button className="button button-secondary" onClick={() => setRevision(revision + 1)}>Thử lại</button></> : !member ? <p role="status">Đang tải hội viên…</p> : <>
        <MemberAvatar name={member.name} avatar={member.avatar} />
        <dl className="detail-grid">{[["Họ và tên", member.name], ["Doanh nghiệp", member.company], ["Điện thoại", member.phone], ["Email", member.email], ["Mã hội viên", member.id]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
      </>}
    </div>
  </dialog>;
}

function ActionDialog({ place, action, onClose, onSaved }: {
  place: LocalGoPlace;
  action: "visibility" | "delete";
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deleting = action === "delete";
  const hiding = !deleting && place.isVisible;
  const title = deleting ? "Xóa địa điểm" : hiding ? "Ẩn địa điểm" : "Hiện địa điểm";
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (hiding && !reason) { setError("Vui lòng nhập lý do ẩn địa điểm."); return; }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (deleting) await localGoApi.remove(place.id);
      else await localGoApi.visibility(place.id, !place.isVisible, reason);
      notify.success(deleting ? "Đã xóa mềm địa điểm." : hiding ? "Đã ẩn địa điểm." : "Đã hiện địa điểm.");
      onSaved();
      onClose();
    } catch (cause) { setError(message(cause)); notify.error(message(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="record-dialog" aria-labelledby="localgo-action-title" onCancel={(event) => { if (busyRef.current) event.preventDefault(); else onClose(); }}>
    <form onSubmit={submit}>
      <div className="dialog-header"><h2 id="localgo-action-title">{title}</h2><button type="button" className="icon-button" aria-label="Đóng xác nhận" disabled={busy} onClick={onClose}><X size={20} /></button></div>
      <div className="dialog-body"><p>{title} “{place.name}”?</p>{deleting && <p>Địa điểm sẽ được xóa mềm và không còn hiển thị trong danh sách.</p>}
        {hiding && <label className="form-field"><span>Lý do ẩn *</span><textarea name="reason" required maxLength={1000} disabled={busy} rows={3} autoFocus /></label>}
        {error && <p role="alert" className="error-message">{error}</p>}
      </div>
      <div className="dialog-footer"><button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>Hủy</button><button className="button button-primary" disabled={busy}>{busy ? "Đang xử lý…" : title}</button></div>
    </form>
  </dialog>;
}

export default function LocalGoPage() {
  const [tab, setTab] = useState<"places" | "categories">("places");
  const [rows, setRows] = useState<LocalGoPlace[]>([]);
  const [categories, setCategories] = useState<LocalGoCategory[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<LocalGoPlace | null | undefined>();
  const [memberId, setMemberId] = useState<string>();
  const [action, setAction] = useState<{ place: LocalGoPlace; kind: "visibility" | "delete" }>();
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const refresh = () => setRevision((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setCategoriesLoading(true);
      try { const data = await localGoApi.categories(controller.signal); if (!controller.signal.aborted) { setCategories(data); setCategoryError(""); } }
      catch (cause) { if (!controller.signal.aborted) setCategoryError(message(cause)); }
      finally { if (!controller.signal.aborted) setCategoriesLoading(false); }
    })();
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      try {
        const result = await localGoApi.listPlaces({ page, limit, ...(query ? { search: query } : {}), ...(category ? { category } : {}) }, controller.signal);
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.pagination.total / limit));
        if (page > lastPage) { setPage(lastPage); return; }
        setRows(result.data); setTotal(result.pagination.total); setError("");
      } catch (cause) { if (!controller.signal.aborted) setError(message(cause)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [page, query, category, revision]);
  async function edit(id: string) {
    if (openingRef.current) return;
    openingRef.current = true; setOpening(true);
    try { setEditing(await localGoApi.get(id)); }
    catch (cause) { notify.error(message(cause)); }
    finally { openingRef.current = false; setOpening(false); }
  }
  const pages = Math.max(1, Math.ceil(total / limit));
  return <AppShell activeHref="/admin/localgo"><div className={styles.workspace}>
    <header className={styles.header}><div><span className="eyebrow">QUẢN LÝ NỘI DUNG</span><h1>LocalGo</h1><p>Quản lý địa điểm và kết nối cộng đồng hội viên.</p></div>
      {tab === "places" && <button className="button button-primary" disabled={categoriesLoading || !!categoryError || !categories.length || opening} onClick={() => setEditing(null)}><Plus size={17} />Thêm địa điểm</button>}
    </header>
    <nav className={styles.tabs} aria-label="Quản lý LocalGo">{([["places", "Địa điểm"], ["categories", "Danh mục"]] as const).map(([id, label]) => <button key={id} className={`button ${tab === id ? "button-primary" : "button-secondary"}`} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {categoryError && <div role="alert" className="error-message">{categoryError} <button className="button button-secondary" onClick={refresh}>Thử lại</button></div>}
    {tab === "categories" ? <section className={styles.panel} aria-label="Danh mục LocalGo">
      <p className={styles.message}>Danh mục hiện do hệ thống quy định. Chưa hỗ trợ thêm, sửa hoặc xóa danh mục.</p>
      {categoriesLoading ? <p role="status" className={styles.message}>Đang tải danh mục…</p> : !categoryError && <div className={styles.table}><table><thead><tr><th>Mã danh mục</th><th>Tên danh mục</th></tr></thead><tbody>{categories.map((item) => <tr key={item.code}><td>{item.code}</td><td>{item.name}</td></tr>)}</tbody></table>{!categories.length && <p className={styles.message}>Chưa có danh mục.</p>}</div>}
    </section> : <section className={styles.panel} aria-label="Danh sách địa điểm">
      <form className={styles.toolbar} onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
        <input aria-label="Tìm kiếm địa điểm" placeholder="Tên, địa chỉ hoặc mô tả địa điểm…" maxLength={150} value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Lọc danh mục" value={category} disabled={categoriesLoading || !!categoryError} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">Tất cả danh mục</option>{categories.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select>
        <button className="button button-secondary"><Search size={17} />Tìm kiếm</button>
        {(query || category) && <button type="button" className="button button-secondary" onClick={() => { setSearch(""); setQuery(""); setCategory(""); setPage(1); }}>Xóa bộ lọc</button>}
      </form>
      {loading ? <p role="status" className={styles.message}>Đang tải địa điểm…</p> : error ? <div className={styles.message}><p role="alert" className="error-message">{error}</p><button className="button button-secondary" onClick={refresh}>Thử lại</button></div> : !rows.length ? <div className="empty-state"><h2>{query || category ? "Không tìm thấy địa điểm" : "Chưa có địa điểm"}</h2><p>{query || category ? "Thử thay đổi từ khóa hoặc danh mục." : "Thêm địa điểm đầu tiên để bắt đầu."}</p></div> : <>
        <div className={styles.table}><table><thead><tr><th>Địa điểm</th><th>Danh mục</th><th>Người đăng</th><th>Hiển thị</th><th>Thao tác</th></tr></thead><tbody>{rows.map((place) => <tr key={place.id}>
          <td><strong>{place.name}</strong><small>{place.address}</small></td><td>{categories.find((item) => item.code === place.category)?.name ?? place.category}</td>
          <td>{place.memberId ? <button className="button button-secondary" onClick={() => setMemberId(place.memberId!)}>Xem hội viên</button> : "Quản trị viên"}</td>
          <td><span className={`status-badge status-${place.isVisible ? "green" : "gray"}`}><i />{place.isVisible ? "Đang hiển thị" : "Đã ẩn"}</span></td>
          <td><div className={styles.actions}><button className="icon-button" aria-label={`Sửa ${place.name}`} title="Sửa địa điểm" disabled={opening || !!categoryError || categoriesLoading} onClick={() => void edit(place.id)}><Pencil size={17} /></button>
            <button className="icon-button" aria-label={`${place.isVisible ? "Ẩn" : "Hiện"} ${place.name}`} title={place.isVisible ? "Ẩn địa điểm" : "Hiện địa điểm"} onClick={() => setAction({ place, kind: "visibility" })}>{place.isVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            <button className="icon-button" aria-label={`Xóa mềm ${place.name}`} title="Xóa mềm địa điểm" onClick={() => setAction({ place, kind: "delete" })}><Trash2 size={17} /></button></div></td>
        </tr>)}</tbody></table></div>
        <div className="pagination"><span>{total} địa điểm</span><div><button className="icon-button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><span>Trang {page} / {pages}</span><button className="icon-button" aria-label="Trang sau" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div></div>
      </>}
    </section>}
    {editing !== undefined && <PlaceDialog place={editing} categories={categories} onClose={() => setEditing(undefined)} onSaved={refresh} />}
    {memberId && <MemberDialog key={memberId} id={memberId} onClose={() => setMemberId(undefined)} />}
    {action && <ActionDialog place={action.place} action={action.kind} onClose={() => setAction(undefined)} onSaved={refresh} />}
  </div></AppShell>;
}
