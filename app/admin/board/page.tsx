import type { Metadata } from "next";
import BoardPage from "@/components/board/BoardPage";

export const metadata: Metadata = { title: "Ban chấp hành" };

export default function Page() {
  return <BoardPage />;
}
