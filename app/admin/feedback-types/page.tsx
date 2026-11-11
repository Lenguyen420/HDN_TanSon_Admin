import type { Metadata } from "next";

import FeedbackTypesAdminPage from "@/components/feedback-types/FeedbackTypesAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Feedback Types",
  description: "Quản lý loại phản ánh",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/feedback-types">
      <FeedbackTypesAdminPage />
    </AppShell>
  );
}
