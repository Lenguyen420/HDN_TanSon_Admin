import type { Metadata } from "next";

import OcopsAdminPage from "@/components/ocops/OcopsAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin OCOP",
  description: "Quản lý sản phẩm OCOP",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/ocops">
      <OcopsAdminPage />
    </AppShell>
  );
}
