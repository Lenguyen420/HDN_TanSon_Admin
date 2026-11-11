import type { Metadata } from "next";

import BusinessesAdminPage from "@/components/businesses/BusinessesAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Businesses",
  description: "Quản lý doanh nghiệp",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/businesses">
      <BusinessesAdminPage />
    </AppShell>
  );
}
