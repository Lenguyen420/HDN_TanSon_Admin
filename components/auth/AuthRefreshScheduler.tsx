"use client";
import { useEffect } from "react";
import { ApiError, authApi } from "@/services/api";
import { clearAdminAuth, rememberAdminAuth } from "@/services/api/authSession";
export default function AuthRefreshScheduler() {
  useEffect(() => {
    if (window.location.pathname === "/login") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      if (cancelled) return;
      const expiry =
        Number(window.localStorage.getItem("admin_access_expires_at")) ||
        Date.now() + 14 * 60000;
      timer = setTimeout(
        async () => {
          try {
            await authApi.refresh();
            schedule();
          } catch (error) {
            if (error instanceof ApiError && error.statusCode === 401) {
              clearAdminAuth();
              window.location.assign("/login");
            } else if (!cancelled) {
              timer = setTimeout(schedule, 30000);
            }
          }
        },
        Math.max(1000, expiry - Date.now() - 60000),
      );
    };
    void (async () => {
      try {
        const user = await authApi.getMe();
        rememberAdminAuth({ user });
        schedule();
      } catch {
        /* API callers display connectivity errors. */
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return null;
}
