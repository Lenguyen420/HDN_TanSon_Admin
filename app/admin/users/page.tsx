import type { Metadata } from "next";

import AppShell from "@/components/layout/AppShell";
import UsersPanel from "@/components/users/UsersPanel";

export const metadata: Metadata = {
  title: "Admin Users",
  description: "Quản lý người dùng hệ thống",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/users">
      <UsersPanel />
    </AppShell>
  );
}
