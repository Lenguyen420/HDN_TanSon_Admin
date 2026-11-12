export type AdminUser = {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
};
export type AdminLoginData = { expiresIn?: number | null; user?: AdminUser };
export function rememberAdminAuth(data: AdminLoginData) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("admin_access_token");
  window.localStorage.removeItem("admin_refresh_token");
  if (data.user)
    window.localStorage.setItem("admin_user", JSON.stringify(data.user));
  if (typeof data.expiresIn === "number")
    window.localStorage.setItem(
      "admin_access_expires_at",
      String(Date.now() + data.expiresIn * 1000),
    );
}
export function getStoredAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("admin_user") || "null");
  } catch {
    return null;
  }
}
export function clearAdminAuth() {
  if (typeof window === "undefined") return;
  for (const key of [
    "admin_access_token",
    "admin_refresh_token",
    "admin_user",
    "admin_access_expires_at",
  ])
    window.localStorage.removeItem(key);
}
