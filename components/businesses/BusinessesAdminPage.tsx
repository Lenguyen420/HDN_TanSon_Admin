"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createBusiness,
  deleteBusiness,
  getBusinesses,
  updateBusiness,
  type Business,
} from "@/services/businesses";
import LocationSelectFields from "@/components/location/LocationSelectFields";

type BusinessForm = {
  name: string;
  taxCode: string;
  representative: string;
  phone: string;
  email: string;
  website: string;
  field: string;
  addressId: string;
  addressLabel: string;
  address: string;
  province: string;
  provinceCode: string;
  district: string;
  ward: string;
  wardCode: string;
  logoUrl: string;
  status: string;
  description: string;
};

const initialForm: BusinessForm = {
  name: "",
  taxCode: "",
  representative: "",
  phone: "",
  email: "",
  website: "",
  field: "",
  addressId: "",
  addressLabel: "Dia chi chinh",
  address: "",
  province: "",
  provinceCode: "",
  district: "",
  ward: "",
  wardCode: "",
  logoUrl: "",
  status: "ACTIVE",
  description: "",
};

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Có lỗi xảy ra.";
}

function getWebsiteUrl(value?: string) {
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function getPrimaryAddress(business: Business) {
  return (
    business.addresses?.find((address) => address.isPrimary) ??
    business.addresses?.[0]
  );
}

function getBusinessAddressText(business: Business) {
  return getPrimaryAddress(business)?.address ?? business.address ?? "-";
}

function getBusinessLocationText(business: Business) {
  const primaryAddress = getPrimaryAddress(business);
  const parts = [
    business.ward ?? (primaryAddress?.wardCode ? `Mã xã ${primaryAddress.wardCode}` : ""),
    business.district,
    business.province ??
      (primaryAddress?.provinceCode
        ? `Mã tỉnh ${primaryAddress.provinceCode}`
        : ""),
  ].filter(Boolean);

  return parts.join(", ");
}

function isActiveBusiness(business: Business) {
  return business.status === "ACTIVE";
}

export default function BusinessesAdminPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState<BusinessForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredBusinesses = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    if (!searchText) {
      return businesses;
    }
    return businesses.filter((business) => {
      const primaryAddress = getPrimaryAddress(business);
      const content = [
        business.id,
        business.name,
        business.taxCode,
        business.representative,
        business.phone,
        business.email,
        business.website,
        business.field,
        business.industry,
        business.address,
        primaryAddress?.address,
        primaryAddress?.label,
        primaryAddress?.provinceCode,
        primaryAddress?.wardCode,
        business.province,
        business.district,
        business.ward,
        business.status,
        business.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(searchText);
    });
  }, [businesses, keyword]);

  const activeBusinessCount = useMemo(() => {
    return businesses.filter(isActiveBusiness).length;
  }, [businesses]);

  const provinceCount = useMemo(() => {
    return new Set(
      businesses
        .map(
          (business) =>
            business.province ?? getPrimaryAddress(business)?.provinceCode,
        )
        .filter((value) => value && value !== "-"),
    ).size;
  }, [businesses]);

  const businessWithWebsiteCount = useMemo(() => {
    return businesses.filter((business) => Boolean(business.website)).length;
  }, [businesses]);
  const loadBusinesses = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getBusinesses({
        page: 0,
        size: 100,
      });

      setBusinesses(data);
    } catch (error) {
      alert(`Không thể tải danh sách doanh nghiệp: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBusinesses();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBusinesses]);

  const handleChange = (field: keyof BusinessForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (business: Business) => {
    setEditingId(business.id);
    const primaryAddress = getPrimaryAddress(business);

    setForm({
      name: business.name ?? "",
      taxCode: business.taxCode ?? "",
      representative: business.representative ?? "",
      phone: business.phone ?? "",
      email: business.email ?? "",
      website: business.website ?? "",
      field: business.field ?? business.industry ?? "",
      addressId: primaryAddress?.id ?? "",
      addressLabel: primaryAddress?.label ?? "Dia chi chinh",
      address: primaryAddress?.address ?? business.address ?? "",
      province: business.province ?? "",
      provinceCode: primaryAddress?.provinceCode ?? "",
      district: business.district ?? "",
      ward: business.ward ?? "",
      wardCode: primaryAddress?.wardCode ?? "",
      logoUrl: business.logoUrl ?? business.imageUrl ?? "",
      status: business.status ?? "ACTIVE",
      description: business.description ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên doanh nghiệp.");
      return;
    }

    setSaving(true);
    const primaryAddressPayload =
      form.address.trim() || form.provinceCode || form.wardCode
        ? {
            id: form.addressId.trim() || undefined,
            label: form.addressLabel.trim() || "Dia chi chinh",
            address: form.address.trim() || undefined,
            provinceCode: form.provinceCode.trim() || undefined,
            wardCode: form.wardCode.trim() || undefined,
            phone: form.phone.trim() || undefined,
            isPrimary: true,
            order: 0,
          }
        : undefined;

    const payload = {
      name: form.name.trim(),
      taxCode: form.taxCode.trim() || undefined,
      representative: form.representative.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      website: form.website.trim() || undefined,
      field: form.field.trim() || undefined,
      industry: form.field.trim() || undefined,
      address: form.address.trim() || undefined,
      province: form.province.trim() || undefined,
      provinceCode: form.provinceCode.trim() || undefined,
      district: form.district.trim() || undefined,
      ward: form.ward.trim() || undefined,
      wardCode: form.wardCode.trim() || undefined,
      addresses: primaryAddressPayload ? [primaryAddressPayload] : undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      status: form.status.trim() || undefined,
      description: form.description.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateBusiness(editingId, payload);
      } else {
        await createBusiness(payload);
      }

      resetForm();
      await loadBusinesses();
    } catch (error) {
      alert(`Không thể lưu doanh nghiệp: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa doanh nghiệp này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteBusiness(id);
      await loadBusinesses();
    } catch (error) {
      alert(`Không thể xóa doanh nghiệp: ${getErrorMessage(error)}`);
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
                  Cổng thông tin doanh nghiệp
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý doanh nghiệp
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Quản lý thông tin doanh nghiệp, mã số thuế, người đại diện,
                  lĩnh vực hoạt động, địa chỉ, trạng thái và thông tin liên hệ
                  phục vụ công tác quản lý địa phương.
                </p>
              </div>

              <button
                type="button"
                onClick={loadBusinesses}
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
              Tổng doanh nghiệp
            </p>

            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {businesses.length}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Doanh nghiệp đang quản lý
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Đang hoạt động
            </p>

            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {activeBusinessCount}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Doanh nghiệp có trạng thái ACTIVE
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              Khu vực
            </p>

            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {provinceCount}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Tỉnh / thành phố có dữ liệu
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin doanh nghiệp
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId ? "Cập nhật doanh nghiệp" : "Thêm doanh nghiệp"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập đầy đủ thông tin doanh nghiệp để hiển thị trên hệ thống công
              dân số.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 lg:grid-cols-2"
          >
            <div>
              <label className="text-sm font-bold text-slate-700">
                Tên doanh nghiệp <span className="text-red-600">*</span>
              </label>

              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="VD: Công ty TNHH ABC"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Mã số thuế
              </label>

              <input
                value={form.taxCode}
                onChange={(event) =>
                  handleChange("taxCode", event.target.value)
                }
                placeholder="Nhập mã số thuế"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Người đại diện
              </label>

              <input
                value={form.representative}
                onChange={(event) =>
                  handleChange("representative", event.target.value)
                }
                placeholder="Nhập người đại diện"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Lĩnh vực
              </label>

              <input
                value={form.field}
                onChange={(event) => handleChange("field", event.target.value)}
                placeholder="VD: Công nghệ, thương mại, nông nghiệp..."
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

            <div>
              <label className="text-sm font-bold text-slate-700">Email</label>

              <input
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="Nhập email"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Website
              </label>

              <input
                value={form.website}
                onChange={(event) =>
                  handleChange("website", event.target.value)
                }
                placeholder="VD: example.com"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Logo / ảnh
              </label>

              <input
                value={form.logoUrl}
                onChange={(event) =>
                  handleChange("logoUrl", event.target.value)
                }
                placeholder="Nhập URL ảnh"
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
                placeholder="Nhập địa chỉ doanh nghiệp"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <LocationSelectFields
              province={form.province}
              provinceCode={form.provinceCode}
              ward={form.ward}
              wardCode={form.wardCode}
              onProvinceChange={(value) => handleChange("province", value)}
              onProvinceCodeChange={(value) =>
                handleChange("provinceCode", value)
              }
              onWardChange={(value) => handleChange("ward", value)}
              onWardCodeChange={(value) => handleChange("wardCode", value)}
            />

            <div>
              <label className="text-sm font-bold text-slate-700">
                Trạng thái
              </label>

              <select
                value={form.status}
                onChange={(event) => handleChange("status", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Tạm ẩn</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-slate-700">Mô tả</label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange("description", event.target.value)
                }
                placeholder="Nhập mô tả doanh nghiệp"
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
                    ? "Cập nhật doanh nghiệp"
                    : "Thêm mới doanh nghiệp"}
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
                Danh sách doanh nghiệp
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Danh sách doanh nghiệp
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {filteredBusinesses.length} / {businesses.length}{" "}
                doanh nghiệp. Có {businessWithWebsiteCount} doanh nghiệp đã khai
                báo website.
              </p>
            </div>

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên, mã số thuế, lĩnh vực..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-96"
            />
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[1450px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Logo</th>
                  <th className="px-4 py-4 font-bold">Tên doanh nghiệp</th>
                  <th className="px-4 py-4 font-bold">Mã số thuế</th>
                  <th className="px-4 py-4 font-bold">Người đại diện</th>
                  <th className="px-4 py-4 font-bold">Lĩnh vực</th>
                  <th className="px-4 py-4 font-bold">Liên hệ</th>
                  <th className="px-4 py-4 font-bold">Địa chỉ</th>
                  <th className="px-4 py-4 font-bold">Trạng thái</th>
                  <th className="px-4 py-4 font-bold">Ngày tạo</th>
                  <th className="rounded-r-xl px-4 py-4 font-bold">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Đang tải dữ liệu doanh nghiệp...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredBusinesses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có doanh nghiệp nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredBusinesses.map((business) => {
                      const logoUrl = business.logoUrl ?? business.imageUrl;
                      const websiteUrl = getWebsiteUrl(business.website);
                      const isActive = isActiveBusiness(business);

                      return (
                        <tr
                          key={business.id}
                          className="text-slate-700 transition hover:bg-blue-50/60"
                        >
                          <td className="max-w-[170px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                            <span className="block truncate">
                              {business.id}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div
                              className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center text-xs text-slate-400"
                              style={{
                                backgroundImage: logoUrl
                                  ? `url(${logoUrl})`
                                  : undefined,
                              }}
                            >
                              {!logoUrl ? "Logo" : null}
                            </div>
                          </td>

                          <td className="min-w-[260px] border-b border-slate-100 px-4 py-4">
                            <div className="font-bold text-blue-950">
                              {business.name ?? "-"}
                            </div>

                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {business.description ?? ""}
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-800">
                            {business.taxCode ?? "-"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            {business.representative ?? "-"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                              {business.field ?? business.industry ?? "-"}
                            </span>
                          </td>

                          <td className="min-w-[220px] border-b border-slate-100 px-4 py-4">
                            <div className="font-medium">
                              {business.phone ?? "-"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {business.email ?? ""}
                            </div>

                            {business.website ? (
                              <a
                                href={websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex rounded-lg bg-yellow-100 px-3 py-1 text-xs font-bold text-blue-900 transition hover:bg-yellow-200"
                              >
                                Website
                              </a>
                            ) : null}
                          </td>

                          <td className="min-w-[280px] border-b border-slate-100 px-4 py-4">
                            <div>{getBusinessAddressText(business)}</div>

                            <div className="mt-1 text-xs text-slate-500">
                              {getBusinessLocationText(business)}
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                                isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isActive ? "Đang hoạt động" : "Tạm ẩn"}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                            {formatDateTime(business.createdAt)}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(business)}
                                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(business.id)}
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
