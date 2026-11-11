import axiosInstance, { refreshAdminSession } from "./axiosConfig.ts";
import {
  clearAdminAuth,
  rememberAdminAuth,
  type AdminLoginData,
  type AdminUser,
} from "./authSession.ts";

export const authApi = {
  login: async (payload: { username: string; password: string }) => {
    const response = await axiosInstance.post<{ data: AdminLoginData }>(
      "/auth/admin-login",
      payload,
    );
    rememberAdminAuth(response.data.data);
    return response.data.data;
  },
  getMe: async () => {
    const response = await axiosInstance.get<{ data: AdminUser }>("/auth/me");
    return response.data.data;
  },
  refresh: refreshAdminSession,
  logout: async () => {
    await axiosInstance.post("/auth/logout", {});
    clearAdminAuth();
  },
};
