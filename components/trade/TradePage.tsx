"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import TradePosts from "./TradePosts";
import TradeCategories from "./TradeCategories";
import TradeCommunity from "./TradeCommunity";
import TradeReports from "./TradeReports";
import "./trade.css";
const tabs = [
  ["posts", "Tin giao thương"],
  ["categories", "Danh mục"],
  ["reviews", "Đánh giá"],
  ["conversations", "Hội thoại"],
  ["analytics", "Thống kê"],
  ["users", "Tài khoản"],
  ["notifications", "Thông báo"],
] as const;
export default function TradePage() {
  const [tab, setTab] = useState<string>("posts"),
    [postId, setPostId] = useState<string>();
  return (
    <AppShell activeHref="/admin/trade">
      <main className="trade-workspace">
        <header>
          <p className="trade-eyebrow">Kết nối cộng đồng hội viên</p>
          <h1>Giao thương doanh nghiệp</h1>
          <p>
            Quản lý cơ hội hợp tác, sản phẩm và dịch vụ của Hội Doanh nghiệp
            Phường Tân Sơn.
          </p>
        </header>
        <nav className="trade-tabs" aria-label="Quản trị giao thương">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "posts" ? (
          <TradePosts key={postId || "posts"} initialId={postId} />
        ) : tab === "categories" ? (
          <TradeCategories />
        ) : tab === "analytics" ? (
          <TradeReports />
        ) : (
          <TradeCommunity
            key={tab}
            kind={tab}
            onOpenPost={(id) => {
              setPostId(id);
              setTab("posts");
            }}
          />
        )}
      </main>
    </AppShell>
  );
}
