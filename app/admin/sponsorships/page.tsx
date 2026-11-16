import type { Metadata } from "next";
import SponsorshipsPage from "@/components/sponsorships/SponsorshipsPage";

export const metadata: Metadata = { title: "Đơn vị đồng hành" };

export default function Page() {
  return <SponsorshipsPage />;
}
