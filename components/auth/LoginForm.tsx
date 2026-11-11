"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { rememberAccessTokenExpiry } from "@/components/auth/AuthRefreshScheduler";
import { adminLogin, isApiError, rememberAdminAuth } from "@/services/auth.service";
import { canManageRemoteQueue } from "@/components/auth/RemoteQueueGuard";

const DASHBOARD_PATH = "/";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (retryAfter <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRetryAfter((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfter]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (retryAfter > 0) {
      setError(`Vui lòng thử lại sau ${retryAfter} giây.`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const data = await adminLogin({
        username: username.trim(),
        password,
      });
      rememberAdminAuth(data);
      rememberAccessTokenExpiry(data.expiresIn);

      const loggedInUser = data.user ?? data.admin ?? null;
      const role = String(loggedInUser?.systemRole ?? loggedInUser?.role ?? "USER").toUpperCase();
      window.location.assign(role !== "ADMIN" && canManageRemoteQueue(loggedInUser) ? "/admin/remote-queue" : DASHBOARD_PATH);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Không thể đăng nhập.";

      if (isApiError(requestError) && requestError.statusCode === 429) {
        setRetryAfter(requestError.retryAfter ?? 60);
      }

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#182433]">
      <section className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#9f1239] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(185,28,28,0.98),rgba(127,29,29,0.96)_52%,rgba(15,23,42,0.88))]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(0,0,0,0.24),transparent)]" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-yellow-300/60 bg-[#da251d] shadow-sm">
              <span className="text-2xl leading-none text-[#ffff00]">★</span>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-100">
                Ủy ban Mặt trận Tổ quốc Việt Nam
              </p>
              <p className="mt-1 truncate text-lg font-bold text-white">
                Phường Gò Dầu - Tỉnh Tây Ninh
              </p>
            </div>
          </div>

          <div className="relative z-10 max-w-2xl py-10 lg:py-0">
            <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-yellow-50 backdrop-blur">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
              Cổng quản trị nội bộ
            </div>

            <h1 className="max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Đăng nhập hệ thống quản trị
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-6 text-red-50/90 sm:text-base">
              Truy cập khu vực điều hành nội dung, phản ánh kiến nghị và dữ liệu
              hành chính công.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6">
            <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
              <Image
                alt="Skill Trip"
                className="h-auto w-36"
                height={319}
                priority
                src="/logo.png"
                width={781}
              />
            </div>

            <p className="max-w-xs text-sm leading-6 text-yellow-50/90">
              Đồng hành cùng địa phương trong vận hành nền tảng số.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-[390px]">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#b91c1c]">
                Admin
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#182433]">
                Chào mừng trở lại
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Nhập tài khoản quản trị để tiếp tục.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#344054]">
                  Tên đăng nhập
                </span>
                <span className="relative block">
                  <UserRound
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98a2b3]"
                    strokeWidth={1.8}
                  />
                  <input
                    autoComplete="username"
                    className="h-12 w-full rounded-lg border border-[#d0d5dd] bg-white pl-11 pr-3 text-sm text-[#182433] outline-none transition focus:border-[#b91c1c] focus:ring-4 focus:ring-red-100"
                    disabled={isSubmitting}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#344054]">
                  Mật khẩu
                </span>
                <span className="relative block">
                  <LockKeyhole
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98a2b3]"
                    strokeWidth={1.8}
                  />
                  <input
                    autoComplete="current-password"
                    className="h-12 w-full rounded-lg border border-[#d0d5dd] bg-white pl-11 pr-12 text-sm text-[#182433] outline-none transition focus:border-[#b91c1c] focus:ring-4 focus:ring-red-100"
                    disabled={isSubmitting}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#182433]"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((value) => !value)}
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" strokeWidth={1.8} />
                    ) : (
                      <Eye className="h-5 w-5" strokeWidth={1.8} />
                    )}
                  </button>
                </span>
              </label>

              {error ? (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm leading-5 text-red-700">
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    strokeWidth={1.8}
                  />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#b91c1c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:bg-[#d98a8a]"
                disabled={isSubmitting || retryAfter > 0}
                type="submit"
              >
                {isSubmitting ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin"
                    strokeWidth={1.8}
                  />
                ) : (
                  <LogIn
                    aria-hidden="true"
                    className="h-5 w-5"
                    strokeWidth={1.8}
                  />
                )}
                <span>
                  {retryAfter > 0
                    ? `Thử lại sau ${retryAfter}s`
                    : isSubmitting
                      ? "Đang đăng nhập"
                      : "Đăng nhập"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
