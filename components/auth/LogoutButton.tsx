"use client";

import { notify, flashSuccess } from "@/lib/notify";
import { LogOut } from "lucide-react";
import { useState } from "react";

import { authApi } from "@/services/api";

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await authApi.logout();
      flashSuccess("Đã đăng xuất.");
      window.location.replace("/login");
    } catch (cause) {
      notify.error(
        cause instanceof Error ? cause.message : "Không thể đăng xuất.",
      );
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="logout-container">
      <button
        aria-label="Đăng xuất"
        className="icon-button logout-button"
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
