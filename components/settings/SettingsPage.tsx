import AppShell from "@/components/layout/AppShell";
import SettingsForm from "./SettingsForm";

export default function SettingsPage() {
  return (
    <AppShell activeHref="/admin/settings">
      <SettingsForm />
    </AppShell>
  );
}
