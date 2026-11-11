"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { clearAdminAuth } from "@/services/auth.service";

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    clearAdminAuth();

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <div className="border-l border-white/15 pl-2">
      <button
        aria-label="Đăng xuất"
        className="
          flex h-9 items-center justify-center gap-2 rounded-lg px-2
          text-white/85 transition hover:bg-white/15 hover:text-white
          disabled:cursor-not-allowed disabled:opacity-60
        "
        disabled={isLoggingOut}
        onClick={() => void handleLogout()}
        title="Đăng xuất"
        type="button"
      >
        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
        <span className="hidden text-xs font-semibold xl:inline">
          Đăng xuất
        </span>
      </button>
    </div>
  );
}
