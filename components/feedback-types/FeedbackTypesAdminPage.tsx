"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createResource,
  deleteResource,
  getRecordId,
  listResource,
  updateResource,
  type AdminRecord,
} from "@/services/feedback";

const RESOURCE = "feedback-types";

type FeedbackTypeForm = {
  title: string;
  order: string;
};

const initialForm: FeedbackTypeForm = {
  title: "",
  order: "",
};

function getText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function formatDateTime(value: unknown) {
  const text = getText(value);

  if (!text) return "-";

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleString("vi-VN");
}

export default function FeedbackTypesAdminPage() {
  const [feedbackTypes, setFeedbackTypes] = useState<AdminRecord[]>([]);
  const [form, setForm] = useState<FeedbackTypeForm>(initialForm);

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredFeedbackTypes = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    if (!searchText) {
      return feedbackTypes;
    }

    return feedbackTypes.filter((item) => {
      const content = [item.id, item.title, item.name, item.order]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(searchText);
    });
  }, [feedbackTypes, keyword]);

  const loadFeedbackTypes = async () => {
    setLoading(true);

    try {
      const data = await listResource(RESOURCE);
      setFeedbackTypes(data);
    } catch (error) {
      console.error("Lỗi tải loại phản ánh:", error);
      alert("Không thể tải danh sách loại phản ánh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeedbackTypes();
  }, []);

  const handleChange = (field: keyof FeedbackTypeForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (item: AdminRecord) => {
    const id = getRecordId(item);

    if (!id) {
      alert("Không tìm thấy ID loại phản ánh.");
      return;
    }

    setEditingId(id);

    setForm({
      title: getText(item.title) || getText(item.name),
      order: getText(item.order),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Vui lòng nhập tên loại phản ánh.");
      return;
    }

    setSaving(true);

    const payload: AdminRecord = {
      title: form.title.trim(),
      order: form.order.trim() ? Number(form.order) : 0,
    };

    try {
      if (editingId) {
        await updateResource(RESOURCE, editingId, payload);
      } else {
        await createResource(RESOURCE, payload);
      }

      resetForm();
      await loadFeedbackTypes();
    } catch (error) {
      console.error("Lỗi lưu loại phản ánh:", error);
      alert("Không thể lưu loại phản ánh.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AdminRecord) => {
    const id = getRecordId(item);

    if (!id) {
      alert("Không tìm thấy ID loại phản ánh.");
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa loại phản ánh này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteResource(RESOURCE, id);
      await loadFeedbackTypes();
    } catch (error) {
      console.error("Lỗi xóa loại phản ánh:", error);
      alert("Không thể xóa loại phản ánh.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-blue-900/10 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />

          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-yellow-200">
                  Danh mục phản ánh
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý loại phản ánh
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Tạo và quản lý danh mục loại phản ánh để người dân lựa chọn
                  khi gửi phản ánh, kiến nghị trên cổng công dân số.
                </p>
              </div>

              <button
                type="button"
                onClick={loadFeedbackTypes}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-400 px-5 py-3 text-sm font-bold text-blue-950 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang tải dữ liệu..." : "Làm mới dữ liệu"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Tổng loại phản ánh
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {feedbackTypes.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">Danh mục đang quản lý</p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Đang hiển thị
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {filteredFeedbackTypes.length}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Theo bộ lọc tìm kiếm hiện tại
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              Form nhập liệu
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {editingId ? "Sửa" : "Thêm"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Chế độ biểu mẫu hiện tại
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin loại phản ánh
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId ? "Cập nhật loại phản ánh" : "Thêm loại phản ánh"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập tên loại phản ánh và thứ tự hiển thị.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 lg:grid-cols-2"
          >
            <div>
              <label className="text-sm font-bold text-slate-700">
                Tên loại phản ánh <span className="text-red-600">*</span>
              </label>

              <input
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="VD: Hạ tầng, môi trường, an ninh trật tự..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Thứ tự hiển thị
              </label>

              <input
                type="number"
                min={0}
                value={form.order}
                onChange={(event) => handleChange("order", event.target.value)}
                placeholder="VD: 1"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5 lg:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                    ? "Cập nhật loại phản ánh"
                    : "Thêm mới loại phản ánh"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy chỉnh sửa
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Danh sách loại phản ánh
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Danh sách loại phản ánh
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {filteredFeedbackTypes.length} /{" "}
                {feedbackTypes.length} loại phản ánh.
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên loại phản ánh..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-96"
            />
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Tên loại phản ánh</th>
                  <th className="px-4 py-4 font-bold">Thứ tự</th>
                  <th className="px-4 py-4 font-bold">Ngày tạo</th>
                  <th className="rounded-r-xl px-4 py-4 font-bold">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Đang tải dữ liệu loại phản ánh...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredFeedbackTypes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có loại phản ánh nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredFeedbackTypes.map((item) => {
                      const id = getRecordId(item);

                      return (
                        <tr
                          key={String(id)}
                          className="text-slate-700 transition hover:bg-blue-50/60"
                        >
                          <td className="max-w-[220px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                            <span className="block truncate">
                              {id ? String(id) : "-"}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="font-bold text-blue-950">
                              {getText(item.title) || getText(item.name) || "-"}
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                              {getText(item.order) || "0"}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                            {formatDateTime(item.createdAt)}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
