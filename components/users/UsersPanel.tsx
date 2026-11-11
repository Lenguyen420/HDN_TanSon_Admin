"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  type UpdateUserPayload,
  type User,
} from "@/services/users";

type Notice = {
  kind: "success" | "error" | "info";
  message: string;
};

const roleOptions = [
  { value: "", label: "Tất cả chức vụ" },
  { value: "USER", label: "Người dùng" },
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "WARD_CHAIRMAN", label: "Chủ tịch phường" },
  { value: "NEIGHBORHOOD_HEAD", label: "Trưởng khu phố" },
];

const roleLabels: Record<string, string> = {
  USER: "Người dùng",
  ADMIN: "Quản trị viên",
  WARD_CHAIRMAN: "Chủ tịch phường",
  NEIGHBORHOOD_HEAD: "Trưởng khu phố",
};

const statusOptions = [
  { value: "", label: "Chưa chọn" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
  { value: "BLOCKED", label: "Đã khóa" },
  { value: "PENDING", label: "Chờ xử lý" },
];

const MIN_PASSWORD_LENGTH = 6;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRawString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function cleanPayload<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  ) as T;
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState<Notice>({
    kind: "info",
    message: "Đang tải dữ liệu người dùng...",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await getUsers({
        page: 0,
        size: 100,
        keyword: query,
        role: roleFilter,
        status: statusFilter,
      });

      setUsers(data);
      setNotice({
        kind: "success",
        message: `Đã tải ${data.length} người dùng từ /users.`,
      });
    } catch (error) {
      setUsers([]);
      setNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không tải được danh sách người dùng.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, roleFilter, statusFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((user) =>
      JSON.stringify(user).toLowerCase().includes(keyword),
    );
  }, [users, query]);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser?.id) {
      setNotice({
        kind: "error",
        message: "Người dùng không có ID để cập nhật.",
      });
      return;
    }

    const formData = new FormData(event.currentTarget);

    const password = getRawString(formData, "password");
    const passwordConfirm = getRawString(formData, "passwordConfirm");

    if (password || passwordConfirm) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setNotice({
          kind: "error",
          message: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
        });
        return;
      }

      if (password !== passwordConfirm) {
        setNotice({
          kind: "error",
          message: "Xác nhận mật khẩu không khớp với mật khẩu mới.",
        });
        return;
      }
    }

    const payload = cleanPayload<UpdateUserPayload>({
      password,
      username: getString(formData, "username"),
      zalo_id: getString(formData, "zalo_id"),
      avatar: getString(formData, "avatar"),
      image: getString(formData, "image"),
      url: getString(formData, "url"),
      name: getString(formData, "name"),
      email: getString(formData, "email"),
      phone: getString(formData, "phone"),
      title: getString(formData, "title"),
      department: getString(formData, "department"),
      role: getString(formData, "role"),
      businessRole: getString(formData, "businessRole"),
      status: getString(formData, "status"),
    });

    setIsSaving(true);

    try {
      const updated = await updateUser(editingUser.id, payload);

      setUsers((current) =>
        current.map((user) => (user.id === editingUser.id ? updated : user)),
      );

      setEditingUser(null);

      setNotice({
        kind: "success",
        message: password
          ? "Đã cập nhật người dùng và đổi mật khẩu."
          : "Đã cập nhật người dùng.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không cập nhật được người dùng.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: User) {
    const confirmed = window.confirm(
      `Xóa người dùng ${user.username ?? user.id}?`,
    );

    if (!confirmed) return;

    try {
      await deleteUser(user.id);

      setUsers((current) => current.filter((item) => item.id !== user.id));

      setNotice({
        kind: "success",
        message: "Đã xóa người dùng.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Không xóa được người dùng.",
      });
    }
  }

  async function openDetail(user: User) {
    try {
      const detail = await getUserById(user.id);
      setDetailUser(detail);
    } catch {
      setDetailUser(user);
    }
  }

  const noticeClassName = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  }[notice.kind];

  return (
    <main className="mx-auto max-w-[1288px] px-4 py-6">
      <section className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-blue-900/10 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />

          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-yellow-200">
                  Users
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý người dùng
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Quản lý người dùng từ dữ liệu DB qua endpoint /users.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  onClick={loadUsers}
                  type="button"
                >
                  {isLoading ? "Đang tải..." : "Làm mới dữ liệu"}
                </button>

              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Tổng người dùng
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {users.length}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Đang hiển thị
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {filteredUsers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              API dữ liệu
            </p>
            <p className="mt-3 text-2xl font-extrabold text-blue-950">/users</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${noticeClassName}`}
            >
              {notice.message}
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                  GET /users
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                  Danh sách người dùng
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Đang hiển thị {filteredUsers.length} / {users.length} người
                  dùng.
                </p>
              </div>

                  <div className="flex flex-col gap-3 lg:flex-row">
                    <input
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:w-96"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm username, zalo_id, tên, email..."
                value={query}
              />
                    <select
                      className="h-11 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      onChange={(event) => setRoleFilter(event.target.value)}
                      value={roleFilter}
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="h-11 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      onChange={(event) => setStatusFilter(event.target.value)}
                      placeholder="Status"
                      value={statusFilter}
                    />
                  </div>
            </div>
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[1400px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">Avatar</th>
                  <th className="px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Username</th>
                  <th className="px-4 py-4 font-bold">Zalo ID</th>
                  <th className="px-4 py-4 font-bold">Tên</th>
                  <th className="px-4 py-4 font-bold">Liên hệ</th>
                  <th className="px-4 py-4 font-bold">Phòng ban</th>
                  <th className="px-4 py-4 font-bold">Chức vụ</th>
                  <th className="px-4 py-4 font-bold">Business role</th>
                  <th className="px-4 py-4 font-bold">Status</th>
                  <th className="px-4 py-4 font-bold">Permissions</th>
                  <th className="px-4 py-4 font-bold">Đăng nhập</th>
                  <th className="px-4 py-4 font-bold">Ngày tạo</th>
                  <th className="px-4 py-4 font-bold">Cập nhật</th>
                  <th className="rounded-r-xl px-4 py-4 text-right font-bold">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {!isLoading
                  ? filteredUsers.map((user) => (
                      <tr
                        className="align-top text-slate-700 transition hover:bg-blue-50/60"
                        key={user.id}
                      >
                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="h-11 w-11 overflow-hidden rounded-full bg-slate-100">
                            {user.avatar || user.image ? (
                              <img
                                alt={user.username ?? "Avatar"}
                                className="h-full w-full object-cover"
                                src={user.avatar || user.image}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                                U
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="max-w-[220px] border-b border-slate-100 px-4 py-4">
                          <span className="line-clamp-2 break-words text-xs">
                            {user.id}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 font-semibold text-blue-950">
                          {user.username ?? "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {user.zalo_id ?? "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {user.name ?? "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="space-y-1 text-xs">
                            <p>{user.email ?? "-"}</p>
                            <p>{user.phone ?? "-"}</p>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {getStringValue(user.department) || "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                            {roleLabels[getStringValue(user.systemRole) || getStringValue(user.role)] ??
                              getStringValue(user.systemRole) ??
                              getStringValue(user.role) ??
                              "-"}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {getStringValue(user.businessRole) || "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            {getStringValue(user.status) || "-"}
                          </span>
                        </td>

                        <td className="max-w-[220px] border-b border-slate-100 px-4 py-4">
                          <span className="line-clamp-3 break-words text-xs">
                            {user.permissions
                              ? JSON.stringify(user.permissions)
                              : "-"}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {formatDate(getStringValue(user.lastLoginAt))}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {formatDate(user.updatedAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                              onClick={() => void openDetail(user)}
                              type="button"
                            >
                              Chi tiết
                            </button>

                            <button
                              className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-bold text-yellow-700 transition hover:bg-yellow-50"
                              onClick={() => setEditingUser(user)}
                              type="button"
                            >
                              Sửa
                            </button>

                            <button
                              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                              onClick={() => handleDelete(user)}
                              type="button"
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

            {isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                Đang tải dữ liệu...
              </div>
            ) : null}

            {!isLoading && filteredUsers.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                <p className="font-bold text-blue-950">
                  Chưa có người dùng nào.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Thử tải lại dữ liệu hoặc thay đổi từ khóa tìm kiếm.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </section>

      {editingUser ? (
        <UserFormModal
          isSaving={isSaving}
          title="Cập nhật người dùng"
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={handleUpdate}
        />
      ) : null}

      {detailUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-extrabold text-blue-950">
                Chi tiết người dùng
              </h3>
            </div>

            <div className="max-h-[70vh] overflow-auto p-6">
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(detailUser, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                onClick={() => setDetailUser(null)}
                type="button"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function UserFormModal({
  title,
  user,
  isSaving,
  onClose,
  onSubmit,
}: {
  title: string;
  user?: User;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-extrabold text-blue-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Cập nhật hồ sơ, trạng thái và phân quyền hệ thống của người dùng.
          </p>
        </div>

        <form className="max-h-[calc(88vh-81px)] space-y-4 overflow-auto p-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-700">ID</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 outline-none"
                defaultValue={user?.id ?? ""}
                disabled
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Username</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.username ?? ""}
                name="username"
                placeholder="username"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Zalo ID</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.zalo_id ?? ""}
                name="zalo_id"
                placeholder="zalo_123456"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Họ tên</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.name ?? ""}
                name="name"
                placeholder="Nguyễn Văn A"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.email ?? ""}
                name="email"
                placeholder="email@example.com"
                type="email"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Điện thoại</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.phone ?? ""}
                name="phone"
                placeholder="090..."
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Avatar</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.avatar ?? ""}
                name="avatar"
                placeholder="https://example.com/avatar.jpg"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Image</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.image ?? ""}
                name="image"
                placeholder="https://example.com/image.jpg"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">URL</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.url ?? ""}
                name="url"
                placeholder="https://example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Chức danh</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.title ?? ""}
                name="title"
                placeholder="Ông/Bà..."
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Phòng ban</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={getStringValue(user?.department)}
                name="department"
                placeholder="Bộ phận/phòng ban"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Chức vụ</span>
              <select
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.systemRole ?? user?.role ?? "USER"}
                name="role"
              >
                {roleOptions
                  .filter((option) => option.value)
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Business role</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={getStringValue(user?.businessRole)}
                name="businessRole"
                placeholder="Vai trò nghiệp vụ"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Status</span>
              <select
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                defaultValue={user?.status ?? ""}
                name="status"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {user?.status &&
                !statusOptions.some((option) => option.value === user.status) ? (
                  <option value={user.status}>{user.status}</option>
                ) : null}
              </select>
            </label>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-blue-950">
                    Đổi mật khẩu
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Để trống nếu không muốn thay đổi mật khẩu hiện tại. Mật khẩu
                    mới cần tối thiểu {MIN_PASSWORD_LENGTH} ký tự.
                  </p>
                </div>

                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">
                    Mật khẩu mới
                  </span>
                  <input
                    autoComplete="new-password"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                    minLength={MIN_PASSWORD_LENGTH}
                    name="password"
                    placeholder="Nhập mật khẩu mới"
                    type={showPassword ? "text" : "password"}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">
                    Xác nhận mật khẩu
                  </span>
                  <input
                    autoComplete="new-password"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                    minLength={MIN_PASSWORD_LENGTH}
                    name="passwordConfirm"
                    placeholder="Nhập lại mật khẩu mới"
                    type={showPassword ? "text" : "password"}
                  />
                </label>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Mật khẩu chỉ dùng cho tài khoản đăng nhập trực tiếp vào hệ thống
                quản trị. Người dùng đăng nhập qua Zalo không cần mật khẩu.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Hủy
            </button>

            <button
              className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
