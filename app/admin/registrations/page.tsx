import type { Metadata } from "next";
import RegistrationsPage from "@/components/registrations/RegistrationsPage";

export const metadata: Metadata = { title: "Đăng ký hội viên" };

export default function Page() {
  return <RegistrationsPage />;
}
