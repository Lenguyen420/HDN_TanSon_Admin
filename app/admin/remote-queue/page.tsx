import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import RemoteQueueGuard from "@/components/auth/RemoteQueueGuard";
import RemoteQueuePage from "@/components/remote-queue/RemoteQueuePage";

export const metadata: Metadata = {
  title: "Quản lý lấy số từ xa",
  description: "Theo dõi và điều phối lượt phục vụ tại Trung tâm Hành chính công",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/remote-queue">
      <RemoteQueueGuard><RemoteQueuePage /></RemoteQueueGuard>
    </AppShell>
  );
}
