import EventParticipationList from "@/components/events/EventParticipationList";
import AppShell from "@/components/layout/AppShell";
import CollectionPage from "@/components/shared/association/CollectionPage";

export default function ActivitiesPage() {
  return (
    <AppShell activeHref="/admin/activities">
      <div className="page-stack">
        <div className="page-heading">
          <div>
            <h1>Lịch sử tham gia</h1>
          </div>
        </div>
        <EventParticipationList />
        <details>
          <summary>Bản ghi nhập thủ công</summary>
          <CollectionPage section="activities" />
        </details>
      </div>
    </AppShell>
  );
}
