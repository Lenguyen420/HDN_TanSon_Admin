import type { Metadata } from "next";
import NewsPage from "@/components/news/NewsPage";

export const metadata: Metadata = { title: "Tin tức" };

export default function Page() {
  return <NewsPage />;
}
