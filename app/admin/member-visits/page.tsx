import type { Metadata } from "next";
import MemberVisitsPage from "@/components/member-visits/MemberVisitsPage";

export const metadata: Metadata = { title: "Thăm hội viên" };

export default function Page() {
  return <MemberVisitsPage />;
}
