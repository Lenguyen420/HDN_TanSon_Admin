import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function NewsPage() {
  return (
    <AppShell activeHref="/admin/news">
      <CollectionPage section="news" />
    </AppShell>
  );
}
