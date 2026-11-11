import type { Metadata } from "next";
import ActivitiesPage from "@/components/activities/ActivitiesPage";

export const metadata: Metadata = { title: "Lịch sử tham gia" };

export default function Page() {
  return <ActivitiesPage />;
}
