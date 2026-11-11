import axios, { type InternalAxiosRequestConfig } from "axios";
import { ApiError } from "./apiError.ts";
import {
  clearAdminAuth,
  rememberAdminAuth,
  type AdminLoginData,
} from "./authSession.ts";

// Next.js forwards HttpOnly cookies to the backend as a Bearer token.
const axiosInstance = axios.create({
  baseURL: "/api",
  timeout: 15000,
  withCredentials: true,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };
const sessionEndpoints = new Set([
  "/auth/admin-login",
  "/auth/refresh",
  "/auth/logout",
]);

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error))
    return new ApiError(0, "Không thể thực hiện yêu cầu.");
  const message = error.response?.data?.message;
  return new ApiError(
    error.response?.status ?? 0,
    Array.isArray(message)
      ? message.join(", ")
      : typeof message === "string"
        ? message
        : error.code === "ECONNABORTED"
          ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại."
          : error.response
            ? "Không thể thực hiện yêu cầu."
            : "Không kết nối được máy chủ. Vui lòng thử lại.",
    Number(error.response?.headers["retry-after"]) || undefined,
  );
}

function expireSession() {
  clearAdminAuth();
  if (typeof window !== "undefined" && window.location.pathname !== "/login")
    window.location.assign("/login");
}

// Both scheduled refresh and concurrent 401 responses share one request.
let refreshPromise: Promise<AdminLoginData> | null = null;
export function refreshAdminSession(): Promise<AdminLoginData> {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      .post<{ data: AdminLoginData }>("/auth/refresh", {})
      .then(({ data }) => {
        rememberAdminAuth(data.data);
        return data.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.config) {
      const config = error.config as RetryConfig;
      if (
        error.response?.status === 401 &&
        !sessionEndpoints.has(config.url ?? "")
      ) {
        if (config._retried) {
          expireSession();
        } else {
          config._retried = true;
          try {
            await refreshAdminSession();
          } catch (refreshError) {
            const normalized = normalizeError(refreshError);
            if (normalized.statusCode === 401) expireSession();
            throw normalized;
          }
          return axiosInstance.request(config);
        }
      }
    }
    throw normalizeError(error);
  },
);

export default axiosInstance;
