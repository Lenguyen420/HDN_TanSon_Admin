import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function NotificationsPage() {
  return (
    <AppShell activeHref="/admin/notifications">
      <CollectionPage section="notifications" />
    </AppShell>
  );
}
