import type { Metadata } from "next";

import LoginScreen from "@/components/login/LoginPage";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  description: "Đăng nhập hệ thống quản trị Hội Doanh nghiệp Phường Tân Sơn",
};

export default function LoginPage() {
  return <LoginScreen />;
}
