"use client";

import { useEffect } from "react";
import {
  ensureStoredAdminToken,
  rememberAdminAuth,
} from "@/services/auth.service";

const EXPIRES_AT_KEY = "admin_access_expires_at";
const REFRESH_SKEW_MS = 60 * 1000;

function readExpiresAt() {
  const value = window.localStorage.getItem(EXPIRES_AT_KEY);
  const expiresAt = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(expiresAt) ? expiresAt : null;
}

async function refreshSession() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    window.localStorage.removeItem(EXPIRES_AT_KEY);

    if (response.status === 401 && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }

    return false;
  }

  const body = (await response.json()) as {
    data?: {
      accessToken?: string;
      token?: string;
      refreshToken?: string;
      expiresIn?: number | null;
    };
  };
  const expiresIn = body.data?.expiresIn;

  if (body.data) {
    rememberAdminAuth(body.data);
  }

  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) {
    window.localStorage.setItem(
      EXPIRES_AT_KEY,
      String(Date.now() + expiresIn * 1000),
    );
  }

  return true;
}

export function rememberAccessTokenExpiry(expiresIn?: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) {
    window.localStorage.setItem(
      EXPIRES_AT_KEY,
      String(Date.now() + expiresIn * 1000),
    );
  }
}

export default function AuthRefreshScheduler() {
  useEffect(() => {
    if (window.location.pathname === "/login") {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const schedule = () => {
      if (cancelled) {
        return;
      }

      const expiresAt = readExpiresAt();

      if (!expiresAt) {
        return;
      }

      const delay = Math.max(0, expiresAt - Date.now() - REFRESH_SKEW_MS);

      timer = window.setTimeout(async () => {
        await refreshSession();
        schedule();
      }, delay);
    };

    const bootstrap = async () => {
      try {
        await ensureStoredAdminToken();
      } catch {
        return;
      }

      if (!cancelled) {
        schedule();
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return null;
}
