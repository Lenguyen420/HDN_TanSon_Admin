"use client";

import { toast } from "sonner";

export const FLASH_TOAST_KEY = "tanson-flash-toast";

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) =>
    toast.error(message, { id: `error:${message}`, duration: 7000 }),
  info: (message: string) => toast.info(message),
};

// Login/logout reload the document, so deliver their result on the destination.
export function flashSuccess(message: string) {
  try {
    window.sessionStorage.setItem(FLASH_TOAST_KEY, message);
  } catch {
    notify.success(message);
  }
}
