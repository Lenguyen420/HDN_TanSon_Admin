import type { Metadata } from "next";
import EventsPage from "@/components/events/EventsPage";

export const metadata: Metadata = { title: "Sự kiện" };

export default function Page() {
  return <EventsPage />;
}
