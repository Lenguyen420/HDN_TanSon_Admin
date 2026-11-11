import type { Metadata } from "next";

import IndustrialParksAdminPage from "@/components/industrial-parks/IndustrialParksAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Industrial Parks",
  description: "Quản lý khu công nghiệp",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/industrial-parks">
      <IndustrialParksAdminPage />
    </AppShell>
  );
}
