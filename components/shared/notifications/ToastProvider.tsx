"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "sonner";
import { FLASH_TOAST_KEY, notify } from "@/lib/notify";

export default function ToastProvider() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = document.createElement("div");
    container.dataset.toastHost = "";

    // A native modal makes content outside the dialog inert. Keep the same
    // portal container, moving it into the active dialog so toasts stay usable.
    const placeContainer = () => {
      const dialogs =
        document.querySelectorAll<HTMLDialogElement>("dialog[open]");
      const target = dialogs.item(dialogs.length - 1) || document.body;
      if (container.parentElement !== target) target.appendChild(container);
    };
    placeContainer();
    const observer = new MutationObserver(placeContainer);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    const timer = window.setTimeout(() => setHost(container), 0);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      container.remove();
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    const timer = window.setTimeout(() => {
      try {
        const message = window.sessionStorage.getItem(FLASH_TOAST_KEY);
        window.sessionStorage.removeItem(FLASH_TOAST_KEY);
        if (message) notify.success(message);
      } catch {
        // Notifications still work when browser storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [host]);

  if (!host) return null;
  return createPortal(
    <Toaster
      position="top-right"
      theme="light"
      richColors
      closeButton
      expand
      visibleToasts={3}
      duration={4000}
      offset={24}
      mobileOffset={12}
      containerAriaLabel="Thông báo"
      toastOptions={{
        closeButtonAriaLabel: "Đóng thông báo",
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-description",
          closeButton: "app-toast-close",
        },
      }}
    />,
    host,
  );
}
