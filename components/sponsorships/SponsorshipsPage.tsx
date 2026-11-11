import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function SponsorshipsPage() {
  return (
    <AppShell activeHref="/admin/sponsorships">
      <CollectionPage section="sponsorships" />
    </AppShell>
  );
}
