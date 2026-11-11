import type { Metadata } from "next";
import KnowledgeAdminPage from "@/components/knowledge/KnowledgeAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin AI Knowledge",
  description: "Quan ly du lieu tri thuc cung cap cho AI",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/knowledge">
      <KnowledgeAdminPage />
    </AppShell>
  );
}
