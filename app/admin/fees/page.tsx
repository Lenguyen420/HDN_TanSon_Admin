import type { Metadata } from "next";
import FeesPage from "@/components/fees/FeesPage";

export const metadata: Metadata = { title: "Hội phí" };

export default function Page() {
  return <FeesPage />;
}
