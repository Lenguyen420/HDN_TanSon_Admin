import type { Metadata } from "next";
import TradePage from "@/components/trade/TradePage";
export const metadata: Metadata = { title: "Giao thương doanh nghiệp" };
export default function Page() {
  return <TradePage />;
}
