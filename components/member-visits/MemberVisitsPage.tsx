import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function MemberVisitsPage() {
  return (
    <AppShell activeHref="/admin/member-visits">
      <CollectionPage section="member-visits" />
    </AppShell>
  );
}
