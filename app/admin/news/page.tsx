import type { Metadata } from "next";

import AppShell from "@/components/layout/AppShell";
import NewsAdminPage from "@/components/news/NewsAdminPage";
export const metadata: Metadata = {
  title: "Admin News",
  description: "Quản lý tin tức",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/news">
      <NewsAdminPage />
    </AppShell>
  );
}
