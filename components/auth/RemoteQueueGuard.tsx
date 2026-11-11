"use client";

import { ShieldX } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminSystemRole,
  getStoredAdminUser,
  type AdminUser,
} from "@/services/auth.service";

export function getPermissions(user: AdminUser | null): string[] {
  const value = user?.permissions;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.toUpperCase());
}

export function canManageRemoteQueue(user: AdminUser | null) {
  return getAdminSystemRole(user) === "ADMIN" || getPermissions(user).includes("REMOTE_QUEUE_MANAGE");
}

export default function RemoteQueueGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const user = getStoredAdminUser();
      setState(canManageRemoteQueue(user) ? "allowed" : "denied");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  if (state === "loading") {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200" aria-label="Đang kiểm tra quyền" />;
  }
  if (state === "denied") {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <ShieldX className="mx-auto h-12 w-12 text-red-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Bạn không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tài khoản cần quyền REMOTE_QUEUE_MANAGE. Vui lòng liên hệ quản trị viên.
        </p>
        <button className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 font-semibold text-white" onClick={() => router.replace("/login")} type="button">
          Quay lại đăng nhập
        </button>
      </section>
    );
  }
  return children;
}
