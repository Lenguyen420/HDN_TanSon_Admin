"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createLegalDocument,
  deleteLegalDocument,
  getLegalDocuments,
  updateLegalDocument,
  type LegalDocument,
} from "@/services/legal-document";
import {
  getDocumentCategories,
  type DocumentCategory,
} from "@/services/document-categories";
type LegalDocumentForm = {
  title: string;
  category: string;
  categoryId: string;
  code: string;
  issuedAt: string;
  link: string;
};

const initialForm: LegalDocumentForm = {
  title: "",
  category: "",
  categoryId: "",
  code: "",
  issuedAt: "",
  link: "",
};

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function toInputDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getCategoryName(document: LegalDocument) {
  if (document.documentCategory?.name) {
    return document.documentCategory.name;
  }

  return document.category ?? "-";
}

export default function LegalDocumentsAdminPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [form, setForm] = useState<LegalDocumentForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentCategories, setDocumentCategories] = useState<
    DocumentCategory[]
  >([]);
  const filteredDocuments = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    if (!searchText) {
      return documents;
    }

    return documents.filter((document) => {
      const content = [
        document.title,
        document.code,
        document.category,
        document.documentCategory?.name,
        document.link,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(searchText);
    });
  }, [documents, keyword]);
  const categoryCount = useMemo(() => {
    return new Set(
      documents
        .map((document) => getCategoryName(document))
        .filter((value) => value && value !== "-"),
    ).size;
  }, [documents]);

  const latestIssuedAt = useMemo(() => {
    const latest = documents
      .map((document) => {
        if (!document.issuedAt) return null;

        const date = new Date(document.issuedAt);

        return Number.isNaN(date.getTime()) ? null : date;
      })
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return latest ? formatDate(latest.toISOString()) : "-";
  }, [documents]);
  const loadDocuments = async () => {
    setLoading(true);

    try {
      const [documentsData, categoriesData] = await Promise.all([
        getLegalDocuments(),
        getDocumentCategories(),
      ]);

      setDocuments(documentsData);
      setDocumentCategories(categoriesData);
    } catch (error) {
      console.error("Lỗi tải dữ liệu văn bản pháp luật:", error);
      alert("Không thể tải dữ liệu văn bản pháp luật.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const handleChange = (field: keyof LegalDocumentForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleCategorySelect = (categoryId: string) => {
    const selectedCategory = documentCategories.find(
      (category) => category.id === categoryId,
    );

    setForm((prev) => ({
      ...prev,
      categoryId,
      category: selectedCategory?.name ?? "",
    }));
  };
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (document: LegalDocument) => {
    setEditingId(document.id);

    setForm({
      title: document.title ?? "",
      category: document.category ?? document.documentCategory?.name ?? "",
      categoryId: document.categoryId ?? document.documentCategory?.id ?? "",
      code: document.code ?? "",
      issuedAt: toInputDate(document.issuedAt),
      link: document.link ?? "",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Vui lòng nhập tên văn bản.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      categoryId: form.categoryId.trim() || undefined,
      code: form.code.trim(),
      issuedAt: form.issuedAt || undefined,
      link: form.link.trim(),
    };

    try {
      if (editingId) {
        await updateLegalDocument(editingId, payload);
      } else {
        await createLegalDocument(payload);
      }

      resetForm();
      await loadDocuments();
    } catch (error) {
      console.error("Lỗi lưu văn bản pháp luật:", error);
      alert("Không thể lưu văn bản pháp luật.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa văn bản pháp luật này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteLegalDocument(id);
      await loadDocuments();
    } catch (error) {
      console.error("Lỗi xóa văn bản pháp luật:", error);
      alert("Không thể xóa văn bản pháp luật.");
    }
  };

  return (
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
                Quản lý văn bản pháp luật
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                Cập nhật, tra cứu và quản lý hệ thống văn bản phục vụ công tác
                chỉ đạo điều hành, thủ tục hành chính và công khai thông tin cho
                người dân.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDocuments}
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
            Tổng văn bản
          </p>
          <p className="mt-3 text-3xl font-extrabold text-blue-950">
            {documents.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Văn bản đã được nhập vào hệ thống
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
            Danh mục
          </p>
          <p className="mt-3 text-3xl font-extrabold text-blue-950">
            {categoryCount}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Nhóm văn bản đang quản lý
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
            Mới ban hành
          </p>
          <p className="mt-3 text-3xl font-extrabold text-blue-950">
            {latestIssuedAt}
          </p>
          <p className="mt-1 text-sm text-slate-500">Ngày ban hành gần nhất</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            Thông tin văn bản
          </p>

          <h2 className="mt-2 text-xl font-extrabold text-blue-950">
            {editingId
              ? "Cập nhật văn bản pháp luật"
              : "Thêm văn bản pháp luật"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Nhập đầy đủ thông tin để hiển thị trên cổng thông tin công dân số.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 p-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="text-sm font-bold text-slate-700">
              Tên văn bản <span className="text-red-600">*</span>
            </label>
            <input
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder="VD: Triển khai thực hiện Nghị định số..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Danh mục văn bản
            </label>

            <select
              value={form.categoryId}
              onChange={(event) => handleCategorySelect(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
              <option value="">-- Chọn danh mục văn bản --</option>

              {documentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.group ? ` - ${category.group}` : ""}
                </option>
              ))}
            </select>

            {form.category ? (
              <p className="mt-2 text-xs text-slate-500">
                Đã chọn: <span className="font-semibold">{form.category}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Số / mã văn bản
            </label>
            <input
              value={form.code}
              onChange={(event) => handleChange("code", event.target.value)}
              placeholder="VD: 10495/UBND-CNXD"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Ngày ban hành
            </label>
            <input
              type="date"
              value={form.issuedAt}
              onChange={(event) => handleChange("issuedAt", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">
              Đường dẫn văn bản
            </label>
            <input
              value={form.link}
              onChange={(event) => handleChange("link", event.target.value)}
              placeholder="VD: https://mini.zalo.me/"
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
                  ? "Cập nhật văn bản"
                  : "Thêm mới văn bản"}
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
              Danh sách công khai
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              Danh sách văn bản pháp luật
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Đang hiển thị {filteredDocuments.length} / {documents.length} văn
              bản.
            </p>
          </div>

          <div className="w-full lg:w-96">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên, mã, danh mục..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-6">
          <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-blue-950 text-white">
                <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                <th className="px-4 py-4 font-bold">Tên văn bản</th>
                <th className="px-4 py-4 font-bold">Danh mục</th>
                <th className="px-4 py-4 font-bold">Mã văn bản</th>
                <th className="px-4 py-4 font-bold">Ngày ban hành</th>
                <th className="px-4 py-4 font-bold">Link</th>
                <th className="px-4 py-4 font-bold">Ngày tạo</th>
                <th className="px-4 py-4 font-bold">Ngày cập nhật</th>
                <th className="rounded-r-xl px-4 py-4 font-bold">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Đang tải dữ liệu văn bản...
                  </td>
                </tr>
              ) : null}

              {!loading && filteredDocuments.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Chưa có văn bản pháp luật nào.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? filteredDocuments.map((document) => (
                    <tr
                      key={document.id}
                      className="text-slate-700 transition hover:bg-blue-50/60"
                    >
                      <td className="max-w-[170px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                        <span className="block truncate">{document.id}</span>
                      </td>

                      <td className="min-w-[280px] border-b border-slate-100 px-4 py-4">
                        <div className="font-bold leading-6 text-blue-950">
                          {document.title ?? "-"}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                          {getCategoryName(document)}
                        </span>

                        <div className="mt-2 max-w-[190px] truncate text-xs text-slate-400">
                          {document.categoryId ??
                            document.documentCategory?.id ??
                            ""}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-800">
                        {document.code ?? "-"}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {formatDate(document.issuedAt)}
                      </td>

                      <td className="max-w-[180px] border-b border-slate-100 px-4 py-4">
                        {document.link ? (
                          <a
                            href={document.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg bg-yellow-100 px-3 py-2 text-xs font-bold text-blue-900 transition hover:bg-yellow-200"
                          >
                            Mở văn bản
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                        {formatDateTime(document.createdAt)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                        {formatDateTime(document.updatedAt)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(document)}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(document.id)}
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
  );
}
