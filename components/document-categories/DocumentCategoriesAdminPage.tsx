"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createDocumentCategory,
  deleteDocumentCategory,
  getDocumentCategories,
  updateDocumentCategory,
  type DocumentCategory,
} from "@/services/document-categories";

type DocumentCategoryForm = {
  group: string;
  name: string;
  description: string;
  order: string;
};

const initialForm: DocumentCategoryForm = {
  group: "document",
  name: "",
  description: "",
  order: "",
};

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

export default function DocumentCategoriesAdminPage() {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [form, setForm] = useState<DocumentCategoryForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredCategories = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    if (!searchText) {
      return categories;
    }

    return categories.filter((category) => {
      const content = [
        category.id,
        category.group,
        category.name,
        category.description,
        category.order,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(searchText);
    });
  }, [categories, keyword]);
  const groupCount = useMemo(() => {
    return new Set(
      categories
        .map((category) => category.group)
        .filter((value) => value && value !== "-"),
    ).size;
  }, [categories]);

  const highestOrder = useMemo(() => {
    const orders = categories
      .map((category) => Number(category.order))
      .filter((order) => !Number.isNaN(order));

    return orders.length > 0 ? Math.max(...orders) : "-";
  }, [categories]);
  const loadCategories = async () => {
    setLoading(true);

    try {
      const data = await getDocumentCategories({
        page: 0,
        size: 100,
      });

      setCategories(data);
    } catch (error) {
      console.error("Lỗi tải danh mục văn bản:", error);
      alert("Không thể tải danh mục văn bản.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleChange = (field: keyof DocumentCategoryForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (category: DocumentCategory) => {
    setEditingId(category.id);

    setForm({
      group: category.group ?? "document",
      name: category.name ?? "",
      description: category.description ?? "",
      order: typeof category.order === "number" ? String(category.order) : "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên danh mục.");
      return;
    }

    setSaving(true);

    const payload = {
      group: form.group.trim() || "document",
      name: form.name.trim(),
      description: form.description.trim(),
      order: form.order ? Number(form.order) : undefined,
    };

    try {
      if (editingId) {
        await updateDocumentCategory(editingId, payload);
      } else {
        await createDocumentCategory(payload);
      }

      resetForm();
      await loadCategories();
    } catch (error) {
      console.error("Lỗi lưu danh mục văn bản:", error);
      alert("Không thể lưu danh mục văn bản.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa danh mục văn bản này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDocumentCategory(id);
      await loadCategories();
    } catch (error) {
      console.error("Lỗi xóa danh mục văn bản:", error);
      alert("Không thể xóa danh mục văn bản.");
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
                  Cổng quản trị hành chính
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý danh mục văn bản
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Thiết lập nhóm danh mục văn bản pháp luật, văn bản chỉ đạo
                  điều hành, thông báo và hướng dẫn hành chính để hiển thị trên
                  hệ thống công dân số.
                </p>
              </div>

              <button
                type="button"
                onClick={loadCategories}
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
              Tổng danh mục
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {categories.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Danh mục văn bản đang quản lý
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Nhóm danh mục
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {groupCount}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Nhóm dữ liệu đang sử dụng
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              Thứ tự cao nhất
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {highestOrder}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Số thứ tự hiển thị lớn nhất
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin danh mục
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId
                ? "Cập nhật danh mục văn bản"
                : "Thêm danh mục văn bản"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin danh mục để phân loại văn bản pháp luật trên cổng
              thông tin.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 lg:grid-cols-2"
          >
            <div>
              <label className="text-sm font-bold text-slate-700">
                Nhóm danh mục
              </label>

              <input
                value={form.group}
                onChange={(event) => handleChange("group", event.target.value)}
                placeholder="VD: document"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Tên danh mục <span className="text-red-600">*</span>
              </label>

              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="VD: Chỉ đạo điều hành"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Thứ tự hiển thị
              </label>

              <input
                type="number"
                value={form.order}
                onChange={(event) => handleChange("order", event.target.value)}
                placeholder="VD: 1"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-slate-700">Mô tả</label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange("description", event.target.value)
                }
                placeholder="Nhập mô tả cho danh mục văn bản"
                rows={4}
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
                    ? "Cập nhật danh mục"
                    : "Thêm mới danh mục"}
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
                Danh sách phân loại
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Danh sách danh mục văn bản
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {filteredCategories.length} / {categories.length}{" "}
                danh mục.
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên, nhóm, mô tả..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-96"
            />
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Nhóm</th>
                  <th className="px-4 py-4 font-bold">Tên danh mục</th>
                  <th className="px-4 py-4 font-bold">Mô tả</th>
                  <th className="px-4 py-4 font-bold">Thứ tự</th>
                  <th className="px-4 py-4 font-bold">Ngày tạo</th>
                  <th className="px-4 py-4 font-bold">Ngày cập nhật</th>
                  <th className="rounded-r-xl px-4 py-4 font-bold">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Đang tải dữ liệu danh mục...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredCategories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có danh mục văn bản nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredCategories.map((category) => (
                      <tr
                        key={category.id}
                        className="text-slate-700 transition hover:bg-blue-50/60"
                      >
                        <td className="max-w-[180px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                          <span className="block truncate">{category.id}</span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                            {category.group ?? "-"}
                          </span>
                        </td>

                        <td className="min-w-[220px] border-b border-slate-100 px-4 py-4">
                          <div className="font-bold text-blue-950">
                            {category.name ?? "-"}
                          </div>
                        </td>

                        <td className="min-w-[280px] border-b border-slate-100 px-4 py-4 text-slate-600">
                          {category.description ?? "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-yellow-100 px-3 text-xs font-bold text-blue-950">
                            {category.order ?? "-"}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                          {formatDateTime(category.createdAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                          {formatDateTime(category.updatedAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(category.id)}
                              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
