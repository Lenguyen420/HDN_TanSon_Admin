import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function FeesPage() {
  return (
    <AppShell activeHref="/admin/fees">
      <CollectionPage section="fees" />
    </AppShell>
  );
}
