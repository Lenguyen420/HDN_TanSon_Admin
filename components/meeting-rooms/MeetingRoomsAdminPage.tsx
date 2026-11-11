"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createMeetingRoom,
  getMeetingRooms,
  updateMeetingRoom,
  updateMeetingRoomStatus,
  type MeetingRoom,
} from "@/services/meeting-rooms";

type MeetingRoomForm = {
  name: string;
  code: string;
  capacity: string;
  status: string;
  location: string;
  building: string;
  floor: string;
  managerName: string;
  phone: string;
  email: string;
  imageUrl: string;
  equipment: string;
  description: string;
};

type RoomStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "INACTIVE";

type StatusFilter = "all" | RoomStatus;

const initialForm: MeetingRoomForm = {
  name: "",
  code: "",
  capacity: "",
  status: "AVAILABLE",
  location: "",
  building: "",
  floor: "",
  managerName: "",
  phone: "",
  email: "",
  imageUrl: "",
  equipment: "",
  description: "",
};

const statusOptions: Array<{ value: RoomStatus; label: string }> = [
  { value: "AVAILABLE", label: "Sẵn sàng" },
  { value: "IN_USE", label: "Đang sử dụng" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "INACTIVE", label: "Ngừng sử dụng" },
];

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  ...statusOptions,
];

const statusBadgeClass: Record<RoomStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IN_USE: "border-blue-200 bg-blue-50 text-blue-800",
  MAINTENANCE: "border-yellow-200 bg-yellow-100 text-yellow-800",
  INACTIVE: "border-slate-200 bg-slate-100 text-slate-600",
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

function parseOptionalNumber(value: string) {
  const text = value.trim();

  if (!text) {
    return undefined;
  }

  const number = Number(text);

  return Number.isNaN(number) ? undefined : number;
}

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message.includes("403")
      ? "Bạn không có quyền sử dụng chức năng này"
      : error.message;
  }

  return fallback;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[\s_-]+/g, " ")
    .trim();
}

function parseEquipment(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEquipmentList(room: MeetingRoom): string[] {
  if (Array.isArray(room.equipment)) {
    return room.equipment.map(getText).filter(Boolean);
  }

  if (typeof room.equipment === "string") {
    return parseEquipment(room.equipment);
  }

  if (Array.isArray(room.devices)) {
    return room.devices.map((device) => getText(device?.name)).filter(Boolean);
  }

  return [];
}

function getStatusKey(room: MeetingRoom): RoomStatus | null {
  const status = normalizeText(getText(room.status));

  if (!status) {
    if (room.isActive === false) return "INACTIVE";
    if (room.isActive === true) return "AVAILABLE";

    return null;
  }

  if (
    ["available", "active", "ready", "free", "empty", "1", "san sang", "trong"].includes(
      status,
    )
  ) {
    return "AVAILABLE";
  }

  if (
    ["in use", "inuse", "busy", "occupied", "using", "dang su dung", "da dat"].includes(
      status,
    )
  ) {
    return "IN_USE";
  }

  if (["maintenance", "repairing", "repair", "bao tri", "sua chua"].includes(status)) {
    return "MAINTENANCE";
  }

  if (
    ["inactive", "disabled", "closed", "0", "ngung su dung", "ngung hoat dong"].includes(
      status,
    )
  ) {
    return "INACTIVE";
  }

  return null;
}

function getStatusLabel(room: MeetingRoom) {
  const key = getStatusKey(room);

  if (key) {
    return statusOptions.find((option) => option.value === key)?.label ?? key;
  }

  return getText(room.status) || "-";
}

function getCapacityNumber(room: MeetingRoom) {
  const capacity = Number(getText(room.capacity) || getText(room.seats));

  return Number.isNaN(capacity) ? 0 : capacity;
}

function getCapacityText(room: MeetingRoom) {
  const capacity = getText(room.capacity) || getText(room.seats);

  return capacity ? `${capacity} chỗ` : "-";
}

function getLocationText(room: MeetingRoom) {
  const floor = getText(room.floor);

  const parts = [
    getText(room.location) || getText(room.address),
    getText(room.building),
    floor ? `Tầng ${floor}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : "-";
}

function getManagerText(room: MeetingRoom) {
  return getText(room.managerName) || getText(room.contactPerson) || "-";
}

export default function MeetingRoomsAdminPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [form, setForm] = useState<MeetingRoomForm>(initialForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    return rooms.filter((room) => {
      if (statusFilter !== "all" && getStatusKey(room) !== statusFilter) {
        return false;
      }

      if (!searchText) {
        return true;
      }

      const content = [
        room.id,
        room.name,
        room.code,
        room.location,
        room.address,
        room.building,
        room.floor,
        room.capacity,
        room.managerName,
        room.contactPerson,
        room.phone,
        room.email,
        room.description,
        room.status,
        ...getEquipmentList(room),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(searchText);
    });
  }, [rooms, keyword, statusFilter]);

  const availableCount = useMemo(() => {
    return rooms.filter((room) => getStatusKey(room) === "AVAILABLE").length;
  }, [rooms]);

  const inUseCount = useMemo(() => {
    return rooms.filter((room) => getStatusKey(room) === "IN_USE").length;
  }, [rooms]);

  const maintenanceCount = useMemo(() => {
    return rooms.filter((room) => getStatusKey(room) === "MAINTENANCE").length;
  }, [rooms]);

  const totalCapacity = useMemo(() => {
    return rooms.reduce((total, room) => total + getCapacityNumber(room), 0);
  }, [rooms]);

  const loadRooms = async () => {
    setLoading(true);

    try {
      const data = await getMeetingRooms({
        page: 0,
        size: 100,
      });

      setRooms(data);
    } catch (error) {
      console.error("Lỗi tải phòng họp:", error);
      alert(getErrorText(error, "Không thể tải danh sách phòng họp."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRooms();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleChange = (field: keyof MeetingRoomForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (room: MeetingRoom) => {
    setEditingId(room.id);

    setForm({
      name: getText(room.name),
      code: getText(room.code),
      capacity: getText(room.capacity) || getText(room.seats),
      status: getStatusKey(room) ?? getText(room.status),
      location: getText(room.location) || getText(room.address),
      building: getText(room.building),
      floor: getText(room.floor),
      managerName: getText(room.managerName) || getText(room.contactPerson),
      phone: getText(room.phone),
      email: getText(room.email),
      imageUrl: getText(room.imageUrl),
      equipment: getEquipmentList(room).join("\n"),
      description: getText(room.description) || getText(room.note),
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên phòng họp.");
      return;
    }

    setSaving(true);

    const equipment = parseEquipment(form.equipment);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      capacity: parseOptionalNumber(form.capacity),
      status: form.status.trim() || undefined,
      location: form.location.trim() || undefined,
      building: form.building.trim() || undefined,
      floor: form.floor.trim() || undefined,
      managerName: form.managerName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      equipment: equipment.length > 0 ? equipment : undefined,
      description: form.description.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateMeetingRoom(editingId, payload);
      } else {
        await createMeetingRoom(payload);
      }

      resetForm();
      await loadRooms();
    } catch (error) {
      console.error("Lỗi lưu phòng họp:", error);
      alert(getErrorText(error, "Không thể lưu phòng họp."));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (room: MeetingRoom, status: string) => {
    setStatusUpdatingId(room.id);

    try {
      await updateMeetingRoomStatus(room.id, status);
      await loadRooms();
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái phòng họp:", error);
      alert(getErrorText(error, "Không thể cập nhật trạng thái phòng họp."));
    } finally {
      setStatusUpdatingId(null);
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
                  Quản lý phòng họp
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý phòng họp
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Quản lý danh sách phòng họp, sức chứa, vị trí, trang thiết bị
                  và trạng thái sử dụng để phục vụ công tác điều hành và đặt
                  lịch họp trên hệ thống.
                </p>
              </div>

              <button
                type="button"
                onClick={loadRooms}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-400 px-5 py-3 text-sm font-bold text-blue-950 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang tải dữ liệu..." : "Làm mới dữ liệu"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Tổng số phòng
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {rooms.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Phòng họp đang được quản lý
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Sẵn sàng
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {availableCount}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Phòng có thể đặt lịch họp
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Đang sử dụng / bảo trì
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {inUseCount} / {maintenanceCount}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Phòng đang họp và đang bảo trì
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              Tổng sức chứa
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {totalCapacity}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tổng số chỗ ngồi của tất cả phòng
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin phòng họp
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId ? "Cập nhật phòng họp" : "Thêm phòng họp"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin phòng họp để cán bộ có thể tra cứu và đăng ký sử
              dụng phòng.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 p-6 lg:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Tên phòng họp <span className="text-red-600">*</span>
              </label>

              <input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="VD: Phòng họp Ủy ban số 1"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Mã phòng
              </label>

              <input
                value={form.code}
                onChange={(event) => handleChange("code", event.target.value)}
                placeholder="VD: PH-01"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Sức chứa (số chỗ ngồi)
              </label>

              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(event) =>
                  handleChange("capacity", event.target.value)
                }
                placeholder="VD: 30"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Trạng thái
              </label>

              <select
                value={form.status}
                onChange={(event) => handleChange("status", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Vị trí / địa điểm
              </label>

              <input
                value={form.location}
                onChange={(event) =>
                  handleChange("location", event.target.value)
                }
                placeholder="VD: Trụ sở UBND phường Gò Dầu"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Tòa nhà / khu
                </label>

                <input
                  value={form.building}
                  onChange={(event) =>
                    handleChange("building", event.target.value)
                  }
                  placeholder="VD: Khu A"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Tầng</label>

                <input
                  value={form.floor}
                  onChange={(event) => handleChange("floor", event.target.value)}
                  placeholder="VD: 2"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Người phụ trách
              </label>

              <input
                value={form.managerName}
                onChange={(event) =>
                  handleChange("managerName", event.target.value)
                }
                placeholder="VD: Nguyễn Văn A"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Số điện thoại
                </label>

                <input
                  value={form.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  placeholder="VD: 0276 123 456"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Email</label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  placeholder="VD: vanphong@tanlap.gov.vn"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Ảnh phòng họp (URL)
              </label>

              <input
                value={form.imageUrl}
                onChange={(event) =>
                  handleChange("imageUrl", event.target.value)
                }
                placeholder="https://..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Trang thiết bị
              </label>

              <textarea
                value={form.equipment}
                onChange={(event) =>
                  handleChange("equipment", event.target.value)
                }
                placeholder={"Mỗi thiết bị một dòng.\nVD: Máy chiếu\nMicro không dây"}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Nhập mỗi thiết bị trên một dòng hoặc ngăn cách bằng dấu phẩy.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Mô tả</label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange("description", event.target.value)
                }
                placeholder="Nhập mô tả, quy định sử dụng phòng họp"
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
                    ? "Cập nhật phòng họp"
                    : "Thêm mới phòng họp"}
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
                Danh sách phòng họp
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                Danh sách phòng họp
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {filteredRooms.length} / {rooms.length} phòng họp.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:w-56"
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm theo tên, mã, vị trí, thiết bị..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-96"
              />
            </div>
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">Phòng họp</th>
                  <th className="px-4 py-4 font-bold">Vị trí</th>
                  <th className="px-4 py-4 font-bold">Sức chứa</th>
                  <th className="px-4 py-4 font-bold">Thiết bị</th>
                  <th className="px-4 py-4 font-bold">Trạng thái</th>
                  <th className="px-4 py-4 font-bold">Người phụ trách</th>
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
                      Đang tải dữ liệu phòng họp...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredRooms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có phòng họp nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredRooms.map((room) => {
                      const statusKey = getStatusKey(room);
                      const equipmentList = getEquipmentList(room);

                      return (
                        <tr
                          key={room.id}
                          className="text-slate-700 transition hover:bg-blue-50/60"
                        >
                          <td className="min-w-[220px] border-b border-slate-100 px-4 py-4">
                            <div className="font-bold text-blue-950">
                              {getText(room.name) || "-"}
                            </div>

                            {getText(room.code) ? (
                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                Mã: {getText(room.code)}
                              </div>
                            ) : null}
                          </td>

                          <td className="min-w-[220px] border-b border-slate-100 px-4 py-4 text-slate-600">
                            {getLocationText(room)}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span className="inline-flex h-8 items-center justify-center rounded-lg bg-yellow-100 px-3 text-xs font-bold text-blue-950">
                              {getCapacityText(room)}
                            </span>
                          </td>

                          <td className="min-w-[240px] border-b border-slate-100 px-4 py-4">
                            {equipmentList.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {equipmentList.slice(0, 4).map((item) => (
                                  <span
                                    key={item}
                                    className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800"
                                  >
                                    {item}
                                  </span>
                                ))}

                                {equipmentList.length > 4 ? (
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                    +{equipmentList.length - 4}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                                statusKey
                                  ? statusBadgeClass[statusKey]
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {getStatusLabel(room)}
                            </span>
                          </td>

                          <td className="min-w-[180px] border-b border-slate-100 px-4 py-4">
                            <div className="text-slate-700">
                              {getManagerText(room)}
                            </div>

                            {getText(room.phone) ? (
                              <div className="mt-1 text-xs text-slate-500">
                                {getText(room.phone)}
                              </div>
                            ) : null}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                            {formatDateTime(room.updatedAt ?? room.createdAt)}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(room)}
                                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                              >
                                Sửa
                              </button>

                              <select
                                value={statusKey ?? ""}
                                disabled={statusUpdatingId === room.id}
                                onChange={(event) =>
                                  handleStatusChange(room, event.target.value)
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label="Đổi trạng thái phòng họp"
                              >
                                {statusKey ? null : (
                                  <option value="">Chọn trạng thái</option>
                                )}

                                {statusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
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
