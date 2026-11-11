"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createOcop,
  deleteOcop,
  getOcopReviews,
  getOcopTypes,
  getOcops,
  updateOcop,
  type Ocop,
  type OcopReview,
  type OcopType,
} from "@/services/ocops";

type OcopForm = {
  name: string;
  description: string;
  star: string;
  typeId: string;
  storeId: string;
  imageUrl: string;
  price: string;
  link: string;
};

const initialForm: OcopForm = {
  name: "",
  description: "",
  star: "",
  typeId: "",
  storeId: "",
  imageUrl: "",
  price: "",
  link: "",
};

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function getText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function getObjectName(value: unknown): string {
  const record = asRecord(value);

  if (!record) {
    return getText(value);
  }

  return getText(record.name) || getText(record.title);
}

function getTypeName(ocop: Ocop) {
  return (
    getObjectName(ocop.type) ||
    getObjectName(ocop.ocopType) ||
    getText(ocop.typeId) ||
    "-"
  );
}

function getTypeDescription(ocop: Ocop) {
  const typeRecord = asRecord(ocop.type) ?? asRecord(ocop.ocopType);

  return getText(typeRecord?.description) || getText(typeRecord?.group);
}

function getStoreName(ocop: Ocop) {
  return (
    getObjectName(ocop.store) ||
    getText(ocop.storeName) ||
    getText(ocop.ownerName) ||
    getText(ocop.producer) ||
    getText(ocop.storeId) ||
    "-"
  );
}

function getStoreAddress(ocop: Ocop) {
  const storeRecord = asRecord(ocop.store);

  return getText(storeRecord?.address) || getText(ocop.address);
}

function getStorePhone(ocop: Ocop) {
  const storeRecord = asRecord(ocop.store);

  return getText(storeRecord?.phone) || getText(ocop.phone);
}

function getStoreWebsite(ocop: Ocop) {
  const storeRecord = asRecord(ocop.store);

  return getText(storeRecord?.websiteUrl) || getText(ocop.link);
}

function getStar(ocop: Ocop) {
  return (
    getText(ocop.star) || getText(ocop.stars) || getText(ocop.rating) || "-"
  );
}

export default function OcopsAdminPage() {
  const [ocops, setOcops] = useState<Ocop[]>([]);
  const [ocopTypes, setOcopTypes] = useState<OcopType[]>([]);
  const [form, setForm] = useState<OcopForm>(initialForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reviews, setReviews] = useState<OcopReview[]>([]);
  const [reviewProductName, setReviewProductName] = useState("");

  const filteredOcops = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    if (!searchText) {
      return ocops;
    }

    return ocops.filter((ocop) => {
      const content = [
        ocop.id,
        ocop.name,
        ocop.title,
        ocop.description,
        getTypeName(ocop),
        getTypeDescription(ocop),
        getStoreName(ocop),
        getStoreAddress(ocop),
        getStorePhone(ocop),
        getStoreWebsite(ocop),
        getStar(ocop),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(searchText);
    });
  }, [ocops, keyword]);

  const averageStar = useMemo(() => {
    const stars = ocops
      .map((ocop) => Number(getStar(ocop)))
      .filter((star) => !Number.isNaN(star) && star > 0);

    if (stars.length === 0) {
      return "-";
    }

    const total = stars.reduce((sum, star) => sum + star, 0);

    return (total / stars.length).toFixed(1);
  }, [ocops]);

  const productWithStoreCount = useMemo(() => {
    return ocops.filter((ocop) => getStoreName(ocop) !== "-").length;
  }, [ocops]);
  const loadOcops = async () => {
    setLoading(true);

    try {
      const data = await getOcops({
        page: 0,
        size: 100,
      });

      setOcops(data);
    } catch (error) {
      console.error("Lỗi tải sản phẩm OCOP:", error);
      alert("Không thể tải danh sách sản phẩm OCOP.");
    } finally {
      setLoading(false);
    }
  };

  const loadOcopTypes = async () => {
    try {
      const data = await getOcopTypes();
      setOcopTypes(data);
    } catch (error) {
      console.error("Lỗi tải loại OCOP:", error);
      setOcopTypes([]);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOcops();
      void loadOcopTypes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleChange = (field: keyof OcopForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (ocop: Ocop) => {
    setEditingId(ocop.id);
    const typeRecord = asRecord(ocop.type) ?? asRecord(ocop.ocopType);
    const storeRecord = asRecord(ocop.store);

    setForm({
      name: getText(ocop.name) || getText(ocop.title),
      description: getText(ocop.description),
      star: getText(ocop.star) || getText(ocop.stars) || getText(ocop.rating),
      typeId: getText(ocop.typeId) || getText(typeRecord?.id),
      storeId: getText(ocop.storeId) || getText(storeRecord?.id),
      imageUrl: getText(ocop.imageUrl),
      price: getText(ocop.price),
      link: getText(ocop.link) || getStoreWebsite(ocop),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên sản phẩm OCOP.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      star: form.star ? Number(form.star) : undefined,
      typeId: form.typeId.trim() || undefined,
      storeId: form.storeId.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      price: form.price.trim() || undefined,
      link: form.link.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateOcop(editingId, payload);
      } else {
        await createOcop(payload);
      }

      resetForm();
      await loadOcops();
    } catch (error) {
      console.error("Lỗi lưu sản phẩm OCOP:", error);
      alert("Không thể lưu sản phẩm OCOP.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa sản phẩm OCOP này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteOcop(id);
      await loadOcops();
    } catch (error) {
      console.error("Lỗi xóa sản phẩm OCOP:", error);
      alert("Không thể xóa sản phẩm OCOP.");
    }
  };

  const handleViewReviews = async (ocop: Ocop) => {
    try {
      const data = await getOcopReviews(ocop.id);

      setReviews(data);
      setReviewProductName(getText(ocop.name) || getText(ocop.title));
    } catch (error) {
      console.error("Lỗi tải đánh giá OCOP:", error);
      alert("Không thể tải đánh giá sản phẩm OCOP.");
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
                  Chương trình OCOP
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý sản phẩm OCOP
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Quản lý sản phẩm đặc trưng địa phương, loại sản phẩm, cửa
                  hàng, giá bán, hình ảnh, liên kết giới thiệu và đánh giá của
                  người dùng trên cổng công dân số.
                </p>
              </div>

              <button
                type="button"
                onClick={loadOcops}
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
              Tổng sản phẩm
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {ocops.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Sản phẩm OCOP đang quản lý
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Điểm trung bình
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {averageStar}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Mức đánh giá trung bình sản phẩm
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              Có cửa hàng
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {productWithStoreCount}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Sản phẩm đã liên kết cửa hàng
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin sản phẩm
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId ? "Cập nhật sản phẩm OCOP" : "Thêm sản phẩm OCOP"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin sản phẩm để giới thiệu trên cổng thông tin địa
              phương.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 lg:grid-cols-2"
          >
            <div>
              <label className="text-sm font-bold text-slate-700">
                Tên sản phẩm <span className="text-red-600">*</span>
              </label>

              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Nhập tên sản phẩm"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Loại OCOP
              </label>

              <select
                value={form.typeId}
                onChange={(event) => handleChange("typeId", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Chọn loại OCOP</option>
                {ocopTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name ?? type.title ?? type.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                ID cửa hàng
              </label>

              <input
                value={form.storeId}
                onChange={(event) =>
                  handleChange("storeId", event.target.value)
                }
                placeholder="Nhập storeId"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Giá sản phẩm
              </label>

              <input
                value={form.price}
                onChange={(event) => handleChange("price", event.target.value)}
                placeholder="VD: 120000"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Ảnh sản phẩm
              </label>

              <input
                value={form.imageUrl}
                onChange={(event) =>
                  handleChange("imageUrl", event.target.value)
                }
                placeholder="Nhập URL ảnh"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Link sản phẩm
              </label>

              <input
                value={form.link}
                onChange={(event) => handleChange("link", event.target.value)}
                placeholder="Nhập link sản phẩm"
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
                placeholder="Nhập mô tả sản phẩm"
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
                    ? "Cập nhật sản phẩm"
                    : "Thêm mới sản phẩm"}
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
                Danh sách sản phẩm
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Danh sách sản phẩm OCOP
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {filteredOcops.length} / {ocops.length} sản phẩm.
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên sản phẩm, loại, cửa hàng..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-96"
            />
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[1300px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Ảnh</th>
                  <th className="px-4 py-4 font-bold">Tên sản phẩm</th>
                  <th className="px-4 py-4 font-bold">Loại OCOP</th>
                  <th className="px-4 py-4 font-bold">Cửa hàng</th>
                  <th className="px-4 py-4 font-bold">Đánh giá</th>
                  <th className="px-4 py-4 font-bold">Giá</th>
                  <th className="px-4 py-4 font-bold">Ngày tạo</th>
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
                      Đang tải dữ liệu sản phẩm OCOP...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredOcops.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có sản phẩm OCOP nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredOcops.map((ocop) => (
                      <tr
                        key={ocop.id}
                        className="text-slate-700 transition hover:bg-blue-50/60"
                      >
                        <td className="max-w-[170px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                          <span className="block truncate">{ocop.id}</span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {ocop.imageUrl ? (
                            <img
                              src={ocop.imageUrl}
                              alt={getText(ocop.name)}
                              className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-400">
                              No img
                            </div>
                          )}
                        </td>

                        <td className="min-w-[260px] border-b border-slate-100 px-4 py-4">
                          <div className="font-bold text-blue-950">
                            {getText(ocop.name) || getText(ocop.title) || "-"}
                          </div>

                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {getText(ocop.description)}
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                            {getTypeName(ocop)}
                          </span>
                          {getTypeDescription(ocop) ? (
                            <div className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">
                              {getTypeDescription(ocop)}
                            </div>
                          ) : null}
                        </td>

                        <td className="min-w-[240px] border-b border-slate-100 px-4 py-4 text-slate-700">
                          <div className="font-bold text-blue-950">
                            {getStoreName(ocop)}
                          </div>
                          {getStoreAddress(ocop) ? (
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {getStoreAddress(ocop)}
                            </div>
                          ) : null}
                          {getStorePhone(ocop) ? (
                            <div className="mt-1 text-xs font-semibold text-slate-600">
                              {getStorePhone(ocop)}
                            </div>
                          ) : null}
                          {getStoreWebsite(ocop) ? (
                            <a
                              href={getStoreWebsite(ocop)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:text-blue-900"
                            >
                              Website
                            </a>
                          ) : null}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                            {getStar(ocop)}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 font-bold text-blue-950">
                          {getText(ocop.price) || "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                          {formatDateTime(ocop.createdAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(ocop)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={() => handleViewReviews(ocop)}
                              className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-bold text-yellow-700 transition hover:bg-yellow-50"
                            >
                              Đánh giá
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(ocop.id)}
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

        {reviewProductName ? (
          <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Đánh giá người dùng
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Đánh giá sản phẩm: {reviewProductName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tổng cộng {reviews.length} đánh giá cho sản phẩm này.
              </p>
            </div>

            <div className="overflow-x-auto p-6">
              <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="bg-blue-950 text-white">
                    <th className="rounded-l-xl px-4 py-4 font-bold">
                      Người đánh giá
                    </th>
                    <th className="px-4 py-4 font-bold">SĐT</th>
                    <th className="px-4 py-4 font-bold">Điểm</th>
                    <th className="px-4 py-4 font-bold">Nội dung</th>
                    <th className="rounded-r-xl px-4 py-4 font-bold">
                      Ngày tạo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reviews.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Chưa có đánh giá nào.
                      </td>
                    </tr>
                  ) : null}

                  {reviews.map((review) => (
                    <tr
                      key={review.id}
                      className="text-slate-700 transition hover:bg-blue-50/60"
                    >
                      <td className="border-b border-slate-100 px-4 py-4 font-bold text-blue-950">
                        {review.fullName ?? review.userId ?? "-"}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {review.phone ?? "-"}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                          {review.rating ?? review.stars ?? "-"}
                        </span>
                      </td>

                      <td className="min-w-[280px] border-b border-slate-100 px-4 py-4 text-slate-600">
                        {review.content ?? review.comment ?? "-"}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                        {formatDateTime(review.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
