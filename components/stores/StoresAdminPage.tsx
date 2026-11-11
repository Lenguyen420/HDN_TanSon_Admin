"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createStore,
  deleteStore,
  getStoreById,
  getStores,
  updateStore,
  type Store,
} from "@/services/stores";

type StoreForm = {
  name: string;
  address: string;
  phone: string;
  websiteUrl: string;
};

const initialForm: StoreForm = {
  name: "",
  address: "",
  phone: "",
  websiteUrl: "",
};

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function getText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function getStoreName(store: Store) {
  return getText(store.name) || "-";
}

function getWebsiteUrl(store: Store) {
  return getText(store.websiteUrl) || getText(store.website);
}

export default function StoresAdminPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState<StoreForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const storeWithPhoneCount = useMemo(() => {
    return stores.filter((store) => Boolean(getText(store.phone))).length;
  }, [stores]);

  const storeWithWebsiteCount = useMemo(() => {
    return stores.filter((store) => Boolean(getWebsiteUrl(store))).length;
  }, [stores]);

  const loadStores = useCallback(async (nextKeyword: string) => {
    setLoading(true);

    try {
      const data = await getStores({
        page: 0,
        size: 100,
        keyword: nextKeyword.trim() || undefined,
      });

      setStores(data);
    } catch (error) {
      console.error("Lỗi tải cửa hàng:", error);
      alert("Không thể tải danh sách cửa hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStores("");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStores]);

  const handleChange = (field: keyof StoreForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (store: Store) => {
    setEditingId(store.id);
    setForm({
      name: getStoreName(store) === "-" ? "" : getStoreName(store),
      address: getText(store.address),
      phone: getText(store.phone),
      websiteUrl: getWebsiteUrl(store),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên cửa hàng.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      websiteUrl: form.websiteUrl.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateStore(editingId, payload);
      } else {
        await createStore(payload);
      }

      resetForm();
      await loadStores(keyword);
      if (selectedStore?.id === editingId) {
        const detail = await getStoreById(editingId);
        setSelectedStore(detail);
      }
    } catch (error) {
      console.error("Lỗi lưu cửa hàng:", error);
      alert("Không thể lưu cửa hàng.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa cửa hàng này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteStore(id);
      if (selectedStore?.id === id) {
        setSelectedStore(null);
      }
      await loadStores(keyword);
    } catch (error) {
      console.error("Lỗi xóa cửa hàng:", error);
      alert("Không thể xóa cửa hàng.");
    }
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadStores(keyword);
  };

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);

    try {
      const detail = await getStoreById(id);
      setSelectedStore(detail);
    } catch (error) {
      console.error("Lỗi tải chi tiết cửa hàng:", error);
      alert("Không thể tải chi tiết cửa hàng.");
    } finally {
      setDetailLoading(false);
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
                  Cửa hàng địa phương
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý cửa hàng
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Quản lý danh sách cửa hàng theo API stores, bao gồm tên cửa
                  hàng, địa chỉ, số điện thoại và website.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadStores(keyword)}
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
              Tổng cửa hàng
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {stores.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Cửa hàng đang hiển thị
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Có số điện thoại
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {storeWithPhoneCount}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Cửa hàng có thông tin liên hệ
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Có website
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {storeWithWebsiteCount}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Cửa hàng đã gắn website
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin cửa hàng
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId ? "Cập nhật cửa hàng" : "Thêm cửa hàng"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Dữ liệu lưu theo payload API: name, address, phone, websiteUrl.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 lg:grid-cols-2"
          >
            <div>
              <label className="text-sm font-bold text-slate-700">
                Tên cửa hàng <span className="text-red-600">*</span>
              </label>

              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Nhập tên cửa hàng"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Số điện thoại
              </label>

              <input
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                placeholder="Nhập số điện thoại"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Địa chỉ
              </label>

              <input
                value={form.address}
                onChange={(event) =>
                  handleChange("address", event.target.value)
                }
                placeholder="Nhập địa chỉ cửa hàng"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Website
              </label>

              <input
                value={form.websiteUrl}
                onChange={(event) =>
                  handleChange("websiteUrl", event.target.value)
                }
                placeholder="https://example.com"
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
                    ? "Cập nhật cửa hàng"
                    : "Thêm mới cửa hàng"}
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
                Danh sách cửa hàng
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Stores API
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {stores.length} cửa hàng.
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
            >
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm theo keyword..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-80"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tìm kiếm
              </button>
            </form>
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Tên cửa hàng</th>
                  <th className="px-4 py-4 font-bold">Địa chỉ</th>
                  <th className="px-4 py-4 font-bold">Số điện thoại</th>
                  <th className="px-4 py-4 font-bold">Website</th>
                  <th className="px-4 py-4 font-bold">Ngày tạo</th>
                  <th className="rounded-r-xl px-4 py-4 font-bold">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Đang tải dữ liệu cửa hàng...
                    </td>
                  </tr>
                ) : null}

                {!loading && stores.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có cửa hàng nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? stores.map((store) => {
                      const websiteUrl = getWebsiteUrl(store);

                      return (
                        <tr
                          key={store.id}
                          className="text-slate-700 transition hover:bg-blue-50/60"
                        >
                          <td className="max-w-[190px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                            <span className="block truncate">{store.id}</span>
                          </td>

                          <td className="min-w-[240px] border-b border-slate-100 px-4 py-4 font-bold text-blue-950">
                            {getStoreName(store)}
                          </td>

                          <td className="min-w-[280px] border-b border-slate-100 px-4 py-4 text-slate-600">
                            {getText(store.address) || "-"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                            {getText(store.phone) || "-"}
                          </td>

                          <td className="min-w-[220px] border-b border-slate-100 px-4 py-4">
                            {websiteUrl ? (
                              <a
                                href={websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-700 hover:text-blue-900"
                              >
                                {websiteUrl}
                              </a>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                            {formatDateTime(store.createdAt)}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleViewDetail(store.id)}
                                disabled={detailLoading}
                                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Chi tiết
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(store)}
                                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(store.id)}
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

        {selectedStore ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            onClick={() => setSelectedStore(null)}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />

              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                      Chi tiết cửa hàng
                    </p>

                    <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                      {getStoreName(selectedStore)}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Thông tin đầy đủ của cửa hàng đang chọn.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStore(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-700"
                    aria-label="Đóng popup chi tiết cửa hàng"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-6">
                {detailLoading ? (
                  <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                    Đang tải chi tiết cửa hàng...
                  </p>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      ID
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                      {selectedStore.id}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Số điện thoại
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {getText(selectedStore.phone) || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Địa chỉ
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {getText(selectedStore.address) || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Website
                    </p>

                    {getWebsiteUrl(selectedStore) ? (
                      <a
                        href={getWebsiteUrl(selectedStore)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex break-all text-sm font-bold text-blue-700 hover:text-blue-900"
                      >
                        {getWebsiteUrl(selectedStore)}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        -
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Ngày tạo
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {formatDateTime(selectedStore.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Ngày cập nhật
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {formatDateTime(selectedStore.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setSelectedStore(null)}
                    className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
