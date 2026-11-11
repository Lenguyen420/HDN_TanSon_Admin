import type { Metadata } from "next";

import AppShell from "@/components/layout/AppShell";
import MeetingRoomsAdminPage from "@/components/meeting-rooms/MeetingRoomsAdminPage";

export const metadata: Metadata = {
  title: "Admin Meeting Rooms",
  description: "Quản lý phòng họp",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/meeting-rooms">
      <MeetingRoomsAdminPage />
    </AppShell>
  );
}
