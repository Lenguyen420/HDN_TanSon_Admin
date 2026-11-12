"use client";
import { useState, type FormEvent } from "react";
import type { TradeCategory } from "@/services/trade-types";
import { tradeAdminRequest } from "@/services/api/tradeApi";
import { useTradeAdmin, useTradeTask } from "./useTradeAdmin";
export default function TradeCategories() {
  const list = useTradeAdmin<TradeCategory>("trade-post-categories"),
    task = useTradeTask(),
    [editing, setEditing] = useState<TradeCategory | null>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form),
      body = {
        code: String(data.get("code")).trim(),
        name: String(data.get("name")).trim(),
        description: String(data.get("description") || "").trim(),
        requiresPromotionDetails: data.has("promotion"),
        isActive: data.has("active"),
        ...(editing ? { version: editing.version } : {}),
      };
    await task.run(async () => {
      await tradeAdminRequest(
        "trade-post-categories" + (editing ? "/" + editing.id : ""),
        editing ? "PATCH" : "POST",
        body,
      );
      setEditing(null);
      form.reset();
      list.refresh();
    });
  }
  async function move(index: number, direction: number) {
    const rows = [...list.rows];
    [rows[index], rows[index + direction]] = [
      rows[index + direction],
      rows[index],
    ];
    await task.run(async () => {
      await tradeAdminRequest("trade-post-categories/reorder", "PATCH", {
        items: rows.map((row) => ({ id: row.id, version: row.version })),
      });
      list.refresh();
    });
  }
  return (
    <section className="trade-grid">
      <div className="trade-card">
        <h2>Danh mục giao thương</h2>
        <p>Chỉ quản trị viên cấp cao được tạo, sửa và sắp xếp danh mục.</p>
        {(list.error || task.error) && (
          <p role="alert">{list.error || task.error}</p>
        )}
        {list.loading ? (
          <p>Đang tải danh mục…</p>
        ) : !list.rows.length ? (
          <p>
            Chưa có danh mục. Hãy tạo danh mục đầu tiên để hội viên đăng tin.
          </p>
        ) : (
          <ul className="trade-items">
            {list.rows.map((row, index) => (
              <li key={row.id}>
                <strong>{row.name}</strong>
                <small>
                  {row.code} · {row.isActive ? "Đang hoạt động" : "Tạm ngừng"}
                  {row.requiresPromotionDetails
                    ? " · Yêu cầu thông tin ưu đãi"
                    : ""}
                </small>
                <div className="trade-actions">
                  <button disabled={task.busy} onClick={() => setEditing(row)}>
                    Sửa
                  </button>
                  <button
                    disabled={task.busy}
                    onClick={() =>
                      void task.run(async () => {
                        await tradeAdminRequest(
                          "trade-post-categories/" + row.id + "/status",
                          "PATCH",
                          { version: row.version, isActive: !row.isActive },
                        );
                        list.refresh();
                      })
                    }
                  >
                    {row.isActive ? "Tạm ngừng" : "Kích hoạt"}
                  </button>
                  <button
                    disabled={task.busy || index === 0}
                    aria-label="Đưa lên"
                    onClick={() => void move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    disabled={task.busy || index === list.rows.length - 1}
                    aria-label="Đưa xuống"
                    onClick={() => void move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    disabled={task.busy}
                    onClick={() => {
                      if (confirm("Xóa danh mục “" + row.name + "”?"))
                        void task.run(async () => {
                          await tradeAdminRequest(
                            "trade-post-categories/" + row.id,
                            "DELETE",
                          );
                          list.refresh();
                        });
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form
        key={editing?.id || "new"}
        className="trade-card trade-form"
        onSubmit={save}
      >
        <h2>{editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"}</h2>
        <label>
          Mã danh mục
          <input
            name="code"
            required
            maxLength={50}
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,49}"
            defaultValue={editing?.code}
          />
        </label>
        <label>
          Tên danh mục
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={editing?.name}
          />
        </label>
        <label>
          Mô tả
          <textarea
            name="description"
            maxLength={300}
            defaultValue={editing?.description || ""}
          />
        </label>
        <label className="trade-check">
          <input
            type="checkbox"
            name="promotion"
            defaultChecked={editing?.requiresPromotionDetails}
          />
          Tin cần mức ưu đãi và thời gian áp dụng
        </label>
        <label className="trade-check">
          <input
            type="checkbox"
            name="active"
            defaultChecked={editing?.isActive ?? true}
          />
          Đang hoạt động
        </label>
        <div className="trade-actions">
          <button className="button button-primary" disabled={task.busy}>
            Lưu danh mục
          </button>
          {editing && (
            <button type="button" onClick={() => setEditing(null)}>
              Hủy sửa
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
