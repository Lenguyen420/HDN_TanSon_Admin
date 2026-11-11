"use client";

import { Bell, Grid2X2, Moon, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import { getPermissions } from "@/components/auth/RemoteQueueGuard";
import {
  getAdminSystemRole,
  getStoredAdminToken,
  getStoredAdminUser,
  type AdminUser,
} from "@/services/auth.service";
import {
  getTaskNotifications,
  markTaskNotificationRead,
  type TaskNotification,
} from "@/services/task-management";

const ROLE_LABELS: Record<string, string> = {
  USER: "Người dùng",
  ADMIN: "Quản trị viên",
  WARD_CHAIRMAN: "Chủ tịch phường",
  NEIGHBORHOOD_HEAD: "Trưởng khu phố",
};

const navItems: Array<{
  label: string;
  href: string;
  roles?: string[];
  permission?: string;
}> = [
  {
    label: "Quản lý lấy số từ xa",
    href: "/admin/remote-queue",
    permission: "REMOTE_QUEUE_MANAGE",
  },
  {
    label: "Hẹn làm việc",
    href: "/admin/appointments",
    permission: "REMOTE_QUEUE_MANAGE",
  },
  {
    label: "Đánh giá tại quầy",
    href: "/admin/appointment-ratings",
    roles: ["ADMIN"],
  },
  {
    label: "Tổng quan",
    href: "/",
  },
  {
    label: "Chatbot",
    href: "/admin/knowledge",
  },
  {
    label: "Phản ánh kiến nghị",
    href: "/admin/feedbacks",
  },
  {
    label: "Người dùng",
    href: "/admin/users",
    roles: ["ADMIN"],
  },
  {
    label: "Tin tức",
    href: "/admin/news",
  },
  {
    label: "Cuộc họp",
    href: "/admin/meetings",
  },
  {
    label: "Phòng họp",
    href: "/admin/meeting-rooms",
    roles: ["WARD_CHAIRMAN", "NEIGHBORHOOD_HEAD"],
  },
  {
    label: "Giao việc",
    href: "/admin/assigned-tasks",
    roles: ["ADMIN", "WARD_CHAIRMAN"],
  },
  {
    label: "Nhận việc",
    href: "/admin/received-tasks",
    roles: ["NEIGHBORHOOD_HEAD"],
  },
  {
    label: "Báo cáo điểm",
    href: "/admin/point-report",
    roles: ["ADMIN", "WARD_CHAIRMAN", "NEIGHBORHOOD_HEAD"],
  },
  {
    label: "Tài liệu",
    href: "/admin/documents",
  },
  {
    label: "Thiết bị",
    href: "/admin/devices",
  },
  {
    label: "Báo cáo",
    href: "/admin/reports",
  },
  {
    label: "Văn bản pháp luật",
    href: "/admin/legal-document",
  },
  {
    label: "Danh mục văn bản",
    href: "/admin/document-categories",
  },
  {
    label: "Doanh nghiệp",
    href: "/admin/businesses",
  },
  {
    label: "Khu công nghiệp",
    href: "/admin/industrial-parks",
  },
  {
    label: "Việc làm",
    href: "/admin/jobs",
  },
  {
    label: "Sản phẩm OCOP",
    href: "/admin/ocops",
  },
  {
    label: "Cửa hàng",
    href: "/admin/stores",
  },
  {
    label: "Khu vực",
    href: "/admin/zones",
  },
  {
    label: "Tệp đính kèm",
    href: "/admin/attachments",
  },
];

function canSeeItem(role: string, permissions: string[], itemRoles?: string[], permission?: string) {
  if (permission) return role === "ADMIN" || permissions.includes(permission);
  if (role !== "ADMIN" && permissions.includes("REMOTE_QUEUE_MANAGE")) return false;
  if (!itemRoles) return role !== "USER";
  if (role === "ADMIN" && itemRoles.includes("ADMIN")) return true;

  return itemRoles.includes(role);
}

function PartyFlag() {
  return (
    <div
      aria-label="Cờ Đảng"
      className="
        relative flex h-9 w-14 items-center justify-center overflow-hidden
        rounded-sm border border-yellow-300/50 bg-[#c8102e]
        shadow-sm ring-1 ring-white/20
      "
      title="Cờ Đảng"
    >
      <span className="text-[22px] font-black leading-none text-[#ffd21f]">
        ☭
      </span>

      <span className="absolute inset-x-0 top-0 h-1 bg-white/10" />
      <span className="absolute inset-y-0 left-0 w-1 bg-black/10" />
    </div>
  );
}

function VietnamFlag() {
  return (
    <div
      aria-label="Cờ Tổ quốc Việt Nam"
      className="
        relative flex h-9 w-14 items-center justify-center overflow-hidden
        rounded-sm border border-yellow-300/50 bg-[#da251d]
        shadow-sm ring-1 ring-white/20
      "
      title="Cờ Tổ quốc Việt Nam"
    >
      <span className="text-[24px] leading-none text-[#ffff00]">★</span>

      <span className="absolute inset-x-0 top-0 h-1 bg-white/10" />
      <span className="absolute inset-y-0 left-0 w-1 bg-black/10" />
    </div>
  );
}

function Logo() {
  return (
    <Link
      aria-label="Trang chủ"
      className="group flex min-w-0 items-center gap-4"
      href="/"
    >
      <div className="hidden items-center gap-2 sm:flex">
        <PartyFlag />
        <VietnamFlag />
      </div>

      <div
        className="
          relative min-w-0 overflow-hidden rounded-2xl
          border border-yellow-300/40
          bg-white/10 px-4 py-3
          shadow-sm shadow-red-950/20
          ring-1 ring-white/15
          backdrop-blur
          transition-all duration-300
          group-hover:-translate-y-0.5
          group-hover:bg-white/15
          group-hover:shadow-md
        "
      >
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#ffd21f]" />

        <div className="pl-2 leading-tight">
          <p
            className="
              truncate text-[12px] font-bold uppercase tracking-wide
              text-yellow-100 sm:text-sm
            "
          >
            ỦY BAN MẶT TRẬN TỔ QUỐC VIỆT NAM
          </p>

          <p
            className="
              mt-1 truncate text-[15px] font-extrabold uppercase tracking-wide
              text-white sm:text-base
            "
          >
            Phường Gò Dầu - Tỉnh Tây Ninh
          </p>
        </div>
      </div>
    </Link>
  );
}

function IconButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="
        flex h-9 w-9 items-center justify-center
        rounded-lg border border-white/15
        bg-white/10 text-white/90
        transition
        hover:bg-white/20
        hover:text-white
      "
      title={label}
      type="button"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </button>
  );
}

function OfferText() {
  return (
    <p className="shrink-0 px-12 text-sm text-yellow-50">
      <span className="font-bold text-[#ffd21f]">SKILL TRIP X</span>
      <span className="mx-3 text-yellow-200/70">•</span>
      Công ty phần mềm cung cấp giải pháp công nghệ hiện đại, thiết kế website,
      xây dựng ứng dụng và chuyển đổi số cho doanh nghiệp.
      <span className="mx-3 text-yellow-200/70">•</span>
      <span className="font-semibold text-white">
        Đồng hành cùng doanh nghiệp trên hành trình phát triển số
      </span>
      <span className="mx-3 text-yellow-200/70">•</span>
    </p>
  );
}

function TopOffer() {
  return (
    <div
      className="
        relative flex h-9 w-full items-center overflow-hidden
        border-b border-red-900/30
        bg-gradient-to-r from-[#7f0d0d] via-[#b91c1c] to-[#7f0d0d]
      "
    >
      <div className="animate-marquee flex w-max shrink-0 items-center whitespace-nowrap">
        <OfferText />
        <OfferText />
      </div>
    </div>
  );
}

function Header({ role, user }: { role: string; user: AdminUser | null }) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!["WARD_CHAIRMAN", "NEIGHBORHOOD_HEAD"].includes(role)) {
      return;
    }

    let mounted = true;

    async function loadNotifications() {
      try {
        const data = await getTaskNotifications();

        if (mounted) {
          setNotifications(data);
        }
      } catch {
        if (mounted) {
          setNotifications([]);
        }
      }
    }

    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [role]);

  useEffect(() => {
    if (!["WARD_CHAIRMAN", "NEIGHBORHOOD_HEAD"].includes(role)) {
      return;
    }

    let disconnected = false;
    let socket: { disconnect: () => void; on: (event: string, callback: (payload: TaskNotification) => void) => void } | null = null;

    import("socket.io-client")
      .then(({ io }) => {
        if (disconnected) return;

        socket = io("https://be.government.kidoedu.vn/task-assignments", {
          auth: { token: getStoredAdminToken() },
          extraHeaders: {
            Authorization: `Bearer ${getStoredAdminToken()}`,
          },
          transports: ["websocket", "polling"],
        });

        socket.on("notification-created", (notification: TaskNotification) => {
          setNotifications((current) => [notification, ...current]);

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("admin-toast", {
                detail: notification.title ?? notification.message ?? "Có thông báo mới",
              }),
            );
          }
        });
      })
      .catch(() => undefined);

    return () => {
      disconnected = true;
      socket?.disconnect();
    };
  }, [role]);

  const unreadCount = notifications.filter((item) => !item.readAt && !item.isRead).length;

  async function handleRead(notification: TaskNotification) {
    const id = String(notification.id ?? "");

    if (!id) return;

    try {
      await markTaskNotificationRead(id);
      setNotifications((current) =>
        current.map((item) =>
          String(item.id ?? "") === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
        ),
      );
    } catch {
      setNotifications((current) =>
        current.map((item) =>
          String(item.id ?? "") === id ? { ...item, isRead: true } : item,
        ),
      );
    }
  }

  return (
    <header
      className="
        border-b border-red-950/30
        bg-gradient-to-br from-[#8f1111] via-[#b91c1c] to-[#7f0d0d]
        text-white shadow-md shadow-red-950/20
      "
    >
      <div className="mx-auto flex max-w-[1288px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Logo />

        <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
          <div className="flex items-center gap-2 sm:hidden">
            <PartyFlag />
            <VietnamFlag />
          </div>

          <div className="flex items-center gap-1">
            <IconButton icon={Moon} label="Chế độ tối" />

            <div className="relative">
              <button
                aria-label="Thông báo"
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-lg border border-white/15
                  bg-white/10 text-white/90
                  transition
                  hover:bg-white/20
                  hover:text-white
                "
                onClick={() => setIsOpen((value) => !value)}
                title="Thông báo"
                type="button"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </button>

              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-[#ffd21f] px-1 text-[10px] font-black text-red-900">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}

              {isOpen ? (
                <div className="absolute right-0 top-11 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-extrabold text-blue-950">
                      Thông báo giao việc
                    </p>
                    <p className="text-xs text-slate-500">
                      {unreadCount} thông báo chưa đọc
                    </p>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 8).map((notification, index) => (
                        <button
                          className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
                          key={String(notification.id ?? index)}
                          onClick={() => void handleRead(notification)}
                          type="button"
                        >
                          <span className="block text-sm font-bold text-blue-950">
                            {String(notification.title ?? notification.type ?? "Thông báo")}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600">
                            {String(notification.message ?? notification.content ?? "")}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        Chưa có thông báo.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <IconButton icon={Grid2X2} label="Ứng dụng" />
          </div>

          <div
            className="
              flex items-center gap-3 rounded-xl
              border border-white/15 bg-white/10
              px-3 py-2 backdrop-blur
            "
          >
            <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/20 bg-yellow-100">
              <div className="flex h-full items-end justify-center bg-gradient-to-b from-yellow-200 to-red-700">
                <User className="h-7 w-7 text-white/95" />
              </div>
            </div>

            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">
                {user?.name || user?.username || ROLE_LABELS[role] || "Người dùng"}
              </p>
              <p className="text-xs text-yellow-100/90">
                {ROLE_LABELS[role] ?? role}
              </p>
            </div>

            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavBar({ activeHref, role, permissions }: { activeHref: string; role: string; permissions: string[] }) {
  const visibleItems = navItems.filter((item) => canSeeItem(role, permissions, item.roles, item.permission));

  return (
    <nav
      className="
        border-b border-red-200
        bg-white shadow-sm
      "
    >
      <div className="mx-auto max-w-[1288px] overflow-x-auto px-4">
        <div className="flex min-w-max items-center gap-1">
          {visibleItems.map(({ label, href }) => {
            const active =
              href === "/"
                ? activeHref === "/"
                : activeHref === href || activeHref.startsWith(`${href}/`);

            return (
              <Link
                className={`
                  group relative flex h-13 items-center rounded-t-lg px-3
                  text-sm font-medium transition-colors
                  ${
                    active
                      ? "bg-red-50 text-[#b91c1c]"
                      : "text-[#4b5563] hover:bg-red-50 hover:text-[#b91c1c]"
                  }
                `}
                href={href}
                key={href}
              >
                <span>{label}</span>

                {active ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#b91c1c]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function AppShell({
  activeHref = "/",
  children,
}: {
  activeHref?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setUser(getStoredAdminUser());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const role = useMemo(() => getAdminSystemRole(user), [user]);
  const permissions = useMemo(() => getPermissions(user), [user]);

  useEffect(() => {
    if (!user) return;
    const remoteStaff = role !== "ADMIN" && permissions.includes("REMOTE_QUEUE_MANAGE");
    const staffRoutes = ["/admin/remote-queue", "/admin/appointments"];
    if (remoteStaff && !staffRoutes.includes(activeHref || "")) {
      router.replace("/admin/remote-queue");
    }
  }, [activeHref, permissions, role, router, user]);

  return (
    <div className="min-h-screen bg-[#f7f2ef] text-[#182433]">
      <TopOffer />
      <Header role={role} user={user} />
      <NavBar activeHref={activeHref} permissions={permissions} role={role} />

      <main className="mx-auto w-full max-w-[1288px] px-4 py-6">
        {children}
      </main>
    </div>
  );
}
