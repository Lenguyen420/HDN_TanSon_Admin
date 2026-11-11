import type { Metadata } from "next";

import JobsAdminPage from "@/components/jobs/JobsAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Jobs",
  description: "Quản lý tuyển dụng",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/jobs">
      <JobsAdminPage />
    </AppShell>
  );
}
