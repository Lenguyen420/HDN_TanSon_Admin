"use client";
import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
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
export default function TradePosts({ initialId }: { initialId?: string }) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<TradePost | null>(null),
    [id, setId] = useState(initialId),
    [reason, setReason] = useState("");
  const list = useTradeAdmin<TradePost>("trade-posts", {
      search,
      status,
      page,
      limit: 20,
    }),
    categories = useTradeAdmin<TradeCategory>("trade-post-categories"),
    task = useTradeTask();
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void tradeAdminRequest<TradePost>("trade-posts/" + id)
      .then((result) => {
        if (!cancelled) setSelected(result.data);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  async function action(action: string) {
    if (!selected) return;
    await task.run(async () => {
      const result = await tradeAdminRequest<TradePost>(
        "trade-posts/" + selected.id + "/" + action,
        "PATCH",
        action === "reject"
          ? { reason }
          : action === "feature"
            ? { featured: !selected.featured }
            : {},
      );
      setSelected({
        ...result.data,
        owner: result.data.owner || selected?.owner,
      });
      setReason("");
      list.refresh();
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
      list.refresh();
    });
  }
  return (
    <section>
      <div className="trade-filters">
        <label>
          Tìm tin
          <input
            value={search}
            placeholder="Tiêu đề, mô tả hoặc địa chỉ"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Trạng thái
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(tradeStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={list.refresh}>Tải lại</button>
      </div>
      {(task.error || list.error) && (
        <p role="alert" className="trade-error">
          {task.error || list.error}
        </p>
      )}
      <div className="trade-grid">
        <div className="trade-card">
          <h2>Danh sách tin ({list.meta?.total || 0})</h2>
          {list.loading ? (
            <p>Đang tải tin giao thương…</p>
          ) : !list.rows.length ? (
            <p>Chưa có tin phù hợp.</p>
          ) : (
            <ul className="trade-items">
              {list.rows.map((post) => (
                <li key={post.id}>
                  <button
                    className="trade-link"
                    onClick={() => {
                      setSelected(post);
                      setId(post.id);
                    }}
                  >
                    <strong>{post.title}</strong>
                  </button>
                  <small>
                    {post.owner?.displayName} · {tradeStatusLabels[post.status]}
                    {post.featured ? " · Nổi bật" : ""}
                  </small>
                  <span>{tradePrice(post)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="trade-actions">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trang trước
            </button>
            <span>
              Trang {page}/{list.meta?.totalPages || 1}
            </span>
            <button
              disabled={page >= (list.meta?.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
        {selected && (
          <div className="trade-card">
            <h2>{selected.title}</h2>
            <p>
              {tradeStatusLabels[selected.status]} ·{" "}
              {selected.owner?.displayName}
            </p>
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
                        setSelected(null);
                        list.refresh();
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
                  task.busy || ["PENDING", "ARCHIVED"].includes(selected.status)
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
                  <label key={key}>
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
                <button className="button button-primary">Lưu nội dung</button>
              </fieldset>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
