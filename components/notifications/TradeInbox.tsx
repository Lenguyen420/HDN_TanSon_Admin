"use client";
import Link from "next/link";
import { useTradeInbox } from "./RegistrationInbox";
export default function TradeInbox() {
  const { items, readIds, markRead, error } = useTradeInbox();
  return (
    <section
      className="trade-card"
      style={{
        marginBottom: 24,
        padding: 24,
        background: "white",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
      }}
    >
      <h2>Thông báo giao thương</h2>
      <p>Tin doanh nghiệp vừa gửi Hội xét duyệt.</p>
      {error && <p role="status">{error}</p>}
      {!items.length && <p>Chưa có thông báo giao thương.</p>}
      {items.map((item) => (
        <Link
          key={item.id}
          href={
            item.href +
            "?tradePostId=" +
            encodeURIComponent(item.tradePostId || "")
          }
          onClick={() => markRead(item.id)}
          style={{
            display: "block",
            padding: "14px 0",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <strong>
            {!readIds.includes(item.id) && "● "}
            {item.title}
          </strong>
          <p>{item.description}</p>
          <small>{new Date(item.createdAt).toLocaleString("vi-VN")}</small>
        </Link>
      ))}
    </section>
  );
}
