import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function ActivitiesPage() {
  return (
    <AppShell activeHref="/admin/activities">
      <CollectionPage section="activities" />
    </AppShell>
  );
}
