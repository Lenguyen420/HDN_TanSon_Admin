import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function BoardPage() {
  return (
    <AppShell activeHref="/admin/board">
      <CollectionPage section="board" />
    </AppShell>
  );
}
