"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSearch,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import MemberAvatar from "@/components/shared/association/MemberAvatar";
import { notify } from "@/lib/notify";
import { tradeAdminRequest, tradeAdminMedia } from "@/services/api/tradeApi";
import {
  tradeStatusLabels,
  tradePrice,
  type TradePost,
  type TradeCategory,
} from "@/services/trade-types";
import { useTradeAdmin, useTradeTask } from "./useTradeAdmin";
const localDate = (value?: string | null) =>
  value
    ? new Date(
        new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
const statusLabel = (status: string) =>
  status === "PUBLISHED" ? "Đã duyệt" : tradeStatusLabels[status] || status;
function PostStatus({ status }: { status: string }) {
  const color =
    status === "PENDING"
      ? "amber"
      : status === "PUBLISHED"
        ? "green"
        : status === "REJECTED"
          ? "red"
          : "gray";
  return (
    <span
      className={`status-badge status-${color}`}
      title={status === "PUBLISHED" ? "Đã duyệt và đang hiển thị" : undefined}
    >
      <i />
      {statusLabel(status)}
    </span>
  );
}
export default function TradePosts({ initialId }: { initialId?: string }) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<TradePost | null>(null),
    [id, setId] = useState(initialId),
    [reason, setReason] = useState("");
  const [detailError, setDetailError] = useState("");
  const list = useTradeAdmin<TradePost>("trade-posts", {
      search,
      status,
      page,
      limit: 20,
    }),
    categories = useTradeAdmin<TradeCategory>("trade-post-categories"),
    task = useTradeTask();
  const totals = useTradeAdmin<TradePost>("trade-posts", { limit: 1 });
  const pending = useTradeAdmin<TradePost>("trade-posts", {
    status: "PENDING",
    limit: 1,
  });
  const published = useTradeAdmin<TradePost>("trade-posts", {
    status: "PUBLISHED",
    limit: 1,
  });
  function refreshPosts() {
    list.refresh();
    totals.refresh();
    pending.refresh();
    published.refresh();
  }
  const dialog = useRef<HTMLDialogElement>(null);
  const detailVersion = useRef(0);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  function closeDetail() {
    detailVersion.current++;
    setSelected(null);
    setId(undefined);
    setReason("");
    setDetailError("");
  }
  function openDetail(post: TradePost) {
    setDetailError("");
    setSelected(post);
    setId(post.id);
    setReason("");
  }
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const version = ++detailVersion.current;
    void tradeAdminRequest<TradePost>("trade-posts/" + id)
      .then((result) => {
        if (!cancelled && version === detailVersion.current) {
          setSelected(result.data);
          setDetailError("");
        }
      })
      .catch((cause) => {
        if (!cancelled && version === detailVersion.current)
          setDetailError(
            cause instanceof Error
              ? cause.message
              : "Không tải được chi tiết tin.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  async function action(action: string, target = selected) {
    if (!target) return;
    detailVersion.current++;
    await task.run(async () => {
      const result = await tradeAdminRequest<TradePost>(
        "trade-posts/" + target.id + "/" + action,
        "PATCH",
        action === "reject"
          ? { reason }
          : action === "feature"
            ? { featured: !target.featured }
            : {},
      );
      setSelected((current) =>
        current?.id === target.id
          ? { ...result.data, owner: result.data.owner || current.owner }
          : current,
      );
      notify.success(
        action === "approve"
          ? "Đã duyệt và công bố tin giao thương."
          : action === "reject"
            ? "Đã gửi yêu cầu bổ sung cho người đăng."
            : "Đã cập nhật tin giao thương.",
      );
      setReason("");
      if (action === "approve") {
        // Approved posts stay in the admin list; only their status changes.
        // Backend sorts newly published posts first, so reveal the updated row.
        setStatus("");
        setPage(1);
      }
      refreshPosts();
    });
  }
  async function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget),
      body: Record<string, unknown> = {};
    for (const key of [
      "title",
      "summary",
      "description",
      "category",
      "purpose",
      "priceType",
      "address",
      "contactName",
      "contactPhone",
    ])
      body[key] = String(data.get(key) || "");
    for (const key of ["priceLabel", "contactZalo", "googleMapsUrl"])
      body[key] = String(data.get(key) || "") || null;
    for (const key of ["price", "promotionPercent", "lat", "lng"])
      body[key] = data.get(key) ? Number(data.get(key)) : null;
    for (const key of [
      "promotionStartAt",
      "promotionEndAt",
      "eventStartAt",
      "eventEndAt",
      "expiresAt",
    ])
      body[key] = data.get(key)
        ? new Date(String(data.get(key))).toISOString()
        : null;
    await task.run(async () => {
      const result = await tradeAdminRequest<TradePost>(
        "trade-posts/" + selected.id,
        "PATCH",
        body,
      );
      setSelected({
        ...result.data,
        owner: result.data.owner || selected?.owner,
      });
      refreshPosts();
    });
  }
  return (
    <section className="page-stack" aria-label="Quản lý tin giao thương">
      <div className="collection-summary">
        <div>
          <span>Tổng tin giao thương</span>
          <strong>
            {totals.loading || totals.error ? "—" : (totals.meta?.total ?? 0)}
          </strong>
        </div>
        <div>
          <span>Chờ duyệt</span>
          <strong>
            {pending.loading || pending.error
              ? "—"
              : (pending.meta?.total ?? 0)}
          </strong>
        </div>
        <div>
          <span>Đã duyệt</span>
          <strong>
            {published.loading || published.error
              ? "—"
              : (published.meta?.total ?? 0)}
          </strong>
        </div>
      </div>
      {(task.error ||
        list.error ||
        detailError ||
        categories.error ||
        totals.error ||
        pending.error ||
        published.error) && (
        <p role="alert" className="error-message">
          {task.error ||
            list.error ||
            detailError ||
            categories.error ||
            totals.error ||
            pending.error ||
            published.error}
        </p>
      )}
      <div
        className="panel collection-panel trade-posts-panel"
        aria-label="Danh sách tin giao thương"
      >
        <div className="list-toolbar">
          <div className="table-search">
            <Search size={17} />
            <input
              aria-label="Tìm tin giao thương"
              value={search}
              placeholder="Tìm tin giao thương…"
              maxLength={150}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.keys(tradeStatusLabels).map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
          <button
            className="button button-secondary"
            disabled={list.loading || task.busy}
            onClick={refreshPosts}
          >
            <RefreshCw size={16} />
            Tải lại
          </button>
        </div>
        {list.loading ? (
          <div className="empty-state" role="status">
            Đang tải tin giao thương…
          </div>
        ) : list.error ? (
          <div className="empty-state">
            <h2>Không tải được danh sách</h2>
            <button className="button button-secondary" onClick={refreshPosts}>
              Thử lại
            </button>
          </div>
        ) : !list.rows.length ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FileSearch size={30} />
            </div>
            <h2>
              {search || status
                ? "Không tìm thấy kết quả"
                : "Chưa có tin giao thương"}
            </h2>
            <p>
              {search || status
                ? "Thử tìm với từ khóa khác hoặc bỏ bộ lọc."
                : "Tin doanh nghiệp gửi sẽ được lưu và theo dõi tại đây."}
            </p>
            {(search || status) && (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPage(1);
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table trade-posts-table">
              <thead>
                <tr>
                  <th scope="col">STT</th>
                  <th scope="col">Tin giao thương</th>
                  <th scope="col">Người đăng / Doanh nghiệp</th>
                  <th scope="col">Danh mục</th>
                  <th scope="col">Ngày gửi</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="action-heading">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((post, index) => (
                  <tr key={post.id}>
                    <td>{(page - 1) * 20 + index + 1}</td>
                    <td>
                      <button
                        className="record-title"
                        onClick={() => openDetail(post)}
                      >
                        {post.title}
                      </button>
                      <small className="trade-table-subtitle">
                        {tradePrice(post)}
                        {post.featured ? " · Nổi bật" : ""}
                      </small>
                    </td>
                    <td>
                      <div className="trade-post-owner">
                        <MemberAvatar
                          name={post.owner?.displayName || post.contactName}
                          avatar={post.owner?.avatarUrl}
                        />
                        <div>
                          <strong>
                            {post.owner?.displayName || post.contactName}
                          </strong>
                          <small className="trade-table-subtitle">
                            {post.contactPhone}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {categories.rows.find((c) => c.code === post.category)
                        ?.name || post.category}
                    </td>
                    <td>
                      {new Date(
                        post.submittedAt || post.createdAt,
                      ).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      <PostStatus status={post.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          title="Xem chi tiết"
                          aria-label={`Xem ${post.title}`}
                          disabled={task.busy}
                          onClick={() => openDetail(post)}
                        >
                          <Eye size={16} />
                        </button>
                        {post.status === "PENDING" && (
                          <>
                            <button
                              className="icon-button approve-button"
                              title="Duyệt tin"
                              aria-label={`Duyệt ${post.title}`}
                              disabled={task.busy}
                              onClick={() => void action("approve", post)}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="icon-button danger-button"
                              title="Yêu cầu bổ sung"
                              aria-label={`Yêu cầu bổ sung ${post.title}`}
                              disabled={task.busy}
                              onClick={() => openDetail(post)}
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {!["PENDING", "ARCHIVED"].includes(post.status) && (
                          <button
                            className="icon-button"
                            title="Chỉnh sửa"
                            aria-label={`Sửa ${post.title}`}
                            disabled={task.busy}
                            onClick={() => openDetail(post)}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            {!list.loading && !list.error && list.meta?.total
              ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, list.meta.total)}`
              : 0}{" "}
            / {list.meta?.total ?? 0} bản ghi
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Trang trước"
              disabled={list.loading || page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Trang {page}/{list.meta?.totalPages || 1}
            </span>
            <button
              className="icon-button"
              aria-label="Trang sau"
              disabled={list.loading || page >= (list.meta?.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
      {selected && (
        <dialog
          ref={dialog}
          className="record-dialog trade-post-dialog"
          aria-labelledby="trade-post-title"
          onCancel={(event) => {
            if (task.busy) event.preventDefault();
            else closeDetail();
          }}
        >
          <div className="trade-card">
            <div className="dialog-header">
              <div>
                <span className="eyebrow">CHI TIẾT TIN GIAO THƯƠNG</span>
                <h2 id="trade-post-title">{selected.title}</h2>
              </div>
              <button
                className="icon-button"
                disabled={task.busy}
                onClick={closeDetail}
                aria-label="Đóng chi tiết tin giao thương"
              >
                <X size={20} />
              </button>
            </div>
            <div className="dialog-body">
              <p className="trade-detail-status">
                <PostStatus status={selected.status} />{" "}
                {selected.owner?.displayName}
              </p>
              {(task.error || detailError) && (
                <p role="alert" className="error-message">
                  {task.error || detailError}
                </p>
              )}
              <div className="trade-actions">
                {selected.status === "PENDING" && (
                  <>
                    <button
                      disabled={task.busy}
                      onClick={() => void action("approve")}
                    >
                      Duyệt công bố
                    </button>
                    <input
                      aria-label="Lý do yêu cầu bổ sung"
                      placeholder="Nhập lý do cần bổ sung"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={1000}
                    />
                    <button
                      disabled={task.busy || !reason.trim()}
                      onClick={() => void action("reject")}
                    >
                      Yêu cầu bổ sung
                    </button>
                  </>
                )}
                {selected.status === "PUBLISHED" && (
                  <>
                    <button
                      disabled={task.busy}
                      onClick={() => void action("hide")}
                    >
                      Tạm ẩn
                    </button>
                    <button
                      disabled={task.busy}
                      onClick={() => void action("archive")}
                    >
                      Kết thúc tin
                    </button>
                  </>
                )}
                {selected.status === "HIDDEN" && (
                  <button
                    disabled={task.busy}
                    onClick={() => void action("unhide")}
                  >
                    Hiển thị lại
                  </button>
                )}
                <button
                  disabled={task.busy}
                  onClick={() => void action("feature")}
                >
                  {selected.featured ? "Bỏ nổi bật" : "Chọn nổi bật"}
                </button>
                {["PUBLISHED", "HIDDEN"].includes(selected.status) && (
                  <button
                    disabled={task.busy}
                    onClick={() => {
                      if (confirm("Xóa tin giao thương này?"))
                        void task.run(async () => {
                          await tradeAdminRequest(
                            "trade-posts/" + selected.id,
                            "DELETE",
                          );
                          closeDetail();
                          refreshPosts();
                        });
                    }}
                  >
                    Xóa tin
                  </button>
                )}
              </div>
              {selected.rejectedReason && (
                <p>Lý do bổ sung: {selected.rejectedReason}</p>
              )}
              <div className="trade-gallery">
                {selected.images.map((image) => (
                  <Image
                    key={image.id}
                    src={tradeAdminMedia(image.id)}
                    alt={selected.title}
                    width={240}
                    height={160}
                    unoptimized
                  />
                ))}
              </div>
              <form
                key={selected.id + selected.updatedAt}
                className="trade-form"
                onSubmit={edit}
              >
                <fieldset
                  disabled={
                    task.busy ||
                    ["PENDING", "ARCHIVED"].includes(selected.status)
                  }
                >
                  <legend>Nội dung doanh nghiệp đăng</legend>
                  {(
                    [
                      ["title", "Tiêu đề", 200],
                      ["summary", "Tóm tắt", 500],
                      ["description", "Nội dung", 5000],
                      ["address", "Địa chỉ", 300],
                      ["contactName", "Người liên hệ", 120],
                      ["contactPhone", "Điện thoại", 20],
                    ] as const
                  ).map(([key, label, max]) => (
                    <label
                      key={key}
                      className={
                        key === "description" || key === "summary"
                          ? "full-width"
                          : undefined
                      }
                    >
                      {label}
                      {key === "description" || key === "summary" ? (
                        <textarea
                          name={key}
                          required
                          maxLength={max}
                          defaultValue={selected[key]}
                        />
                      ) : (
                        <input
                          name={key}
                          required
                          maxLength={max}
                          defaultValue={selected[key]}
                        />
                      )}
                    </label>
                  ))}
                  <label>
                    Danh mục
                    <select name="category" defaultValue={selected.category}>
                      {categories.rows.map((row) => (
                        <option key={row.id} value={row.code}>
                          {row.name}
                          {row.isActive ? "" : " (tạm ngừng)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mục đích
                    <select name="purpose" defaultValue={selected.purpose}>
                      <option value="COMMERCIAL">Thương mại</option>
                      <option value="NON_PROFIT">Kết nối cộng đồng</option>
                    </select>
                  </label>
                  <label>
                    Hình thức giá
                    <select
                      name="priceType"
                      defaultValue={selected.priceType || "CONTACT"}
                    >
                      <option value="CONTACT">Liên hệ báo giá</option>
                      <option value="NEGOTIABLE">Thỏa thuận</option>
                      <option value="FIXED">Giá cố định</option>
                    </select>
                  </label>
                  {(
                    [
                      ["price", "Giá (đồng)"],
                      ["promotionPercent", "Ưu đãi (%)"],
                      ["lat", "Vĩ độ"],
                      ["lng", "Kinh độ"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        name={key}
                        type="number"
                        step={key === "promotionPercent" ? "1" : "any"}
                        defaultValue={selected[key] ?? ""}
                      />
                    </label>
                  ))}
                  {(
                    [
                      ["priceLabel", "Ghi chú giá"],
                      ["contactZalo", "Zalo liên hệ"],
                      ["googleMapsUrl", "Liên kết Google Maps"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input name={key} defaultValue={selected[key] || ""} />
                    </label>
                  ))}
                  {(
                    [
                      ["promotionStartAt", "Ưu đãi từ"],
                      ["promotionEndAt", "Ưu đãi đến"],
                      ["eventStartAt", "Hoạt động bắt đầu"],
                      ["eventEndAt", "Hoạt động kết thúc"],
                      ["expiresAt", "Tin hết hiệu lực"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        name={key}
                        type="datetime-local"
                        defaultValue={localDate(selected[key])}
                      />
                    </label>
                  ))}
                  <p>
                    Sửa mục đích, tiêu đề, nội dung, danh mục hoặc giá của tin
                    đang công bố sẽ đưa tin về chờ duyệt.
                  </p>
                  <button className="button button-primary">
                    Lưu nội dung
                  </button>
                </fieldset>
              </form>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
