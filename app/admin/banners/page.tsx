import type { Metadata } from "next";
import BannersPage from "@/components/banners/BannersPage";

export const metadata: Metadata = { title: "Banner trang chủ" };

export default function Page() {
  return <BannersPage />;
}
