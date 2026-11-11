import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function EventsPage() {
  return (
    <AppShell activeHref="/admin/events">
      <CollectionPage section="events" />
    </AppShell>
  );
}
