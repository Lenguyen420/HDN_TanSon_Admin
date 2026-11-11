import type { Metadata } from "next";

import AppShell from "@/components/layout/AppShell";
import { ReceivedTasksPage } from "@/components/tasks/TaskManagementPages";

export const metadata: Metadata = {
  title: "Nhận việc",
  description: "Danh sách việc được giao",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/received-tasks">
      <ReceivedTasksPage />
    </AppShell>
  );
}
