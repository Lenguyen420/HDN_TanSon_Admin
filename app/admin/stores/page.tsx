import type { Metadata } from "next";

import AppShell from "@/components/layout/AppShell";
import StoresAdminPage from "@/components/stores/StoresAdminPage";

export const metadata: Metadata = {
  title: "Admin Stores",
  description: "Quản lý cửa hàng",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/stores">
      <StoresAdminPage />
    </AppShell>
  );
}
