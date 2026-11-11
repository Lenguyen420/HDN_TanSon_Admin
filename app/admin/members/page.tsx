import type { Metadata } from "next";
import MembersPage from "@/components/members/MembersPage";

export const metadata: Metadata = { title: "Hội viên" };

export default function Page() {
  return <MembersPage />;
}
