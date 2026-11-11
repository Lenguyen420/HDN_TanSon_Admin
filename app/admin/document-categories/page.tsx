import type { Metadata } from "next";

import DocumentCategoriesAdminPage from "@/components/document-categories/DocumentCategoriesAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Document Categories",
  description: "Quản lý danh mục văn bản",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/document-categories">
      <DocumentCategoriesAdminPage />
    </AppShell>
  );
}
