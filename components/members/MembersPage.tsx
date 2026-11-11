import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function MembersPage() {
  return (
    <AppShell activeHref="/admin/members">
      <CollectionPage section="members" />
    </AppShell>
  );
}
