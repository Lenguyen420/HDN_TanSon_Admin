import EventInbox from "./EventInbox";
import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

import RegistrationInbox from "./RegistrationInbox";

export default function NotificationsPage() {
  return (
    <AppShell activeHref="/admin/notifications">
      <EventInbox />
      <RegistrationInbox />
      <CollectionPage section="notifications" />
    </AppShell>
  );
}
