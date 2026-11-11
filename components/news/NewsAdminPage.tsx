"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createArticle,
  deleteArticle,
  getArticles,
  getArticleTypes,
  updateArticle,
  type Article,
  type ArticleType,
} from "@/services/news";

type NewsForm = {
  title: string;
  author: string;
  desc: string;
  link: string;
  thumb: string;
  typeId: string;
  publishedAt: string;
};

const initialForm: NewsForm = {
  title: "",
  author: "",
  desc: "",
  link: "",
  thumb: "",
  typeId: "",
  publishedAt: "",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function getTypeTitle(article: Article) {
  return article.type?.title || article.typeId || "-";
}

export default function NewsAdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleTypes, setArticleTypes] = useState<ArticleType[]>([]);
  const [form, setForm] = useState<NewsForm>(initialForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalViews = useMemo(() => {
    return articles.reduce((total, article) => total + (article.views || 0), 0);
  }, [articles]);

  const totalLikes = useMemo(() => {
    return articles.reduce((total, article) => total + (article.likes || 0), 0);
  }, [articles]);

  const loadArticles = useCallback(async (nextKeyword: string) => {
    setLoading(true);

    try {
      const data = await getArticles({
        keyword: nextKeyword.trim() || undefined,
        limit: 200,
      });
      console.log(data);
      setArticles(data.items);
    } catch (error) {
      console.error("Lỗi tải danh sách tin tức:", error);
      alert("Không thể tải danh sách tin tức.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArticleTypes = useCallback(async () => {
    try {
      const data = await getArticleTypes();
      setArticleTypes(data);
    } catch (error) {
      console.error("Lỗi tải loại tin tức:", error);
      setArticleTypes([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadArticles("");
      void loadArticleTypes();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadArticles, loadArticleTypes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadArticles(debouncedKeyword);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [debouncedKeyword, loadArticles]);

  const handleChange = (field: keyof NewsForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (article: Article) => {
    setEditingId(article.id);

    setForm({
      title: article.title || "",
      author: article.author || "",
      desc: article.desc || "",
      link: article.link || "",
      thumb: article.thumb || "",
      typeId: article.typeId || article.type?.id || "",
      publishedAt: toDateTimeLocal(article.publishedAt),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Vui lòng nhập tiêu đề tin tức.");
      return;
    }

    if (!form.publishedAt) {
      alert("Vui lòng chọn ngày đăng.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || undefined,
      desc: form.desc.trim() || undefined,
      link: form.link.trim() || undefined,
      thumb: form.thumb.trim() || undefined,
      typeId: form.typeId.trim() || undefined,
      publishedAt: new Date(form.publishedAt).toISOString(),
    };

    try {
      if (editingId) {
        await updateArticle(editingId, payload);
      } else {
        await createArticle(payload);
      }

      resetForm();
      await loadArticles(debouncedKeyword);
    } catch (error) {
      console.error("Lỗi lưu tin tức:", error);
      alert("Không thể lưu tin tức.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa tin tức này không?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteArticle(id);
      await loadArticles(debouncedKeyword);
    } catch (error) {
      console.error("Lỗi xóa tin tức:", error);
      alert("Không thể xóa tin tức.");
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
                  Tin tức
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý tin tức
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Quản lý tin tức, cẩm nang, hướng dẫn và thông báo hiển thị cho
                  người dân trên cổng công dân số.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadArticles(debouncedKeyword)}
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
              Tổng tin tức
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {articles.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">Bài viết đang quản lý</p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Tổng lượt xem
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {totalViews}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Lượt xem từ người dùng
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              Tổng lượt thích
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {totalLikes}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tương tác yêu thích bài viết
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin bài viết
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId ? "Cập nhật tin tức" : "Thêm tin tức"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập nội dung bài viết để hiển thị trên mini app công dân.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 lg:grid-cols-2"
          >
            <div>
              <label className="text-sm font-bold text-slate-700">
                Tiêu đề tin tức <span className="text-red-600">*</span>
              </label>

              <input
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Nhập tiêu đề tin tức"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Loại tin tức
              </label>

              <select
                value={form.typeId}
                onChange={(event) => handleChange("typeId", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Chọn loại tin tức</option>
                {articleTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Tác giả
              </label>

              <input
                value={form.author}
                onChange={(event) => handleChange("author", event.target.value)}
                placeholder="Nhập tên tác giả"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Ngày đăng <span className="text-red-600">*</span>
              </label>

              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) =>
                  handleChange("publishedAt", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Ảnh đại diện
              </label>

              <input
                value={form.thumb}
                onChange={(event) => handleChange("thumb", event.target.value)}
                placeholder="Nhập URL ảnh đại diện"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Link tin tức
              </label>

              <input
                value={form.link}
                onChange={(event) => handleChange("link", event.target.value)}
                placeholder="Nhập đường dẫn bài viết"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Mô tả ngắn
              </label>

              <textarea
                value={form.desc}
                onChange={(event) => handleChange("desc", event.target.value)}
                placeholder="Nhập mô tả tóm tắt bài viết"
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
                    ? "Cập nhật tin tức"
                    : "Thêm mới tin tức"}
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
                Danh sách bài viết
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Danh sách tin tức
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {articles.length} bài viết từ kết quả backend.
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tiêu đề, tác giả, loại tin..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-96"
            />
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[1300px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Ảnh</th>
                  <th className="px-4 py-4 font-bold">Tiêu đề</th>
                  <th className="px-4 py-4 font-bold">Loại tin</th>
                  <th className="px-4 py-4 font-bold">Tác giả</th>
                  <th className="px-4 py-4 font-bold">Lượt xem</th>
                  <th className="px-4 py-4 font-bold">Lượt thích</th>
                  <th className="px-4 py-4 font-bold">Ngày đăng</th>
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
                      Đang tải dữ liệu tin tức...
                    </td>
                  </tr>
                ) : null}

                {!loading && articles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có tin tức nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? articles.map((article) => (
                      <tr
                        key={article.id}
                        className="text-slate-700 transition hover:bg-blue-50/60"
                      >
                        <td className="max-w-[170px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                          <span className="block truncate">{article.id}</span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {article.thumb ? (
                            <img
                              src={article.thumb}
                              alt={article.title}
                              className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-400">
                              No img
                            </div>
                          )}
                        </td>

                        <td className="min-w-[280px] border-b border-slate-100 px-4 py-4">
                          <div className="font-bold text-blue-950">
                            {article.title}
                          </div>

                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {article.desc || "-"}
                          </div>

                          {article.link ? (
                            <a
                              href={article.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:underline"
                            >
                              Mở liên kết
                            </a>
                          ) : null}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                            {getTypeTitle(article)}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {article.author || "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 font-bold text-blue-950">
                          {article.views ?? 0}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 font-bold text-blue-950">
                          {article.likes ?? 0}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                          {formatDateTime(article.publishedAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(article)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(article.id)}
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
