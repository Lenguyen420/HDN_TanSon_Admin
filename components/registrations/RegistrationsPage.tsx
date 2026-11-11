import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function RegistrationsPage() {
  return (
    <AppShell activeHref="/admin/registrations">
      <CollectionPage section="registrations" />
    </AppShell>
  );
}
