import type { Metadata } from "next";

import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  description: "Đăng nhập hệ thống quản trị hành chính công",
};

export default function LoginPage() {
  return <LoginForm />;
}
