import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function BannersPage() {
  return (
    <AppShell activeHref="/admin/banners">
      <CollectionPage section="banners" />
    </AppShell>
  );
}
