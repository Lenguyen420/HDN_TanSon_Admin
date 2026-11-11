import type { Metadata } from "next";

import AppShell from "@/components/layout/AppShell";
import { AssignedTasksPage } from "@/components/tasks/TaskManagementPages";

export const metadata: Metadata = {
  title: "Giao việc",
  description: "Giao việc cho trưởng khu phố",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/assigned-tasks">
      <AssignedTasksPage />
    </AppShell>
  );
}
