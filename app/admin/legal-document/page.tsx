import type { Metadata } from "next";

import LegalDocumentsAdminPage from "@/components/legal-document/LegalDocumentsAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Legal Documents",
  description: "Quản lý văn bản pháp luật",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/legal-document">
      <LegalDocumentsAdminPage />
    </AppShell>
  );
}
