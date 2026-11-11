import type { Metadata } from "next";
import SponsorshipsPage from "@/components/sponsorships/SponsorshipsPage";

export const metadata: Metadata = { title: "Tài trợ" };

export default function Page() {
  return <SponsorshipsPage />;
}
