"use client";
import Link from "next/link";
import { useFeeInbox } from "./RegistrationInbox";
export default function FeeInbox() {
  const { items, readIds, markRead, error } = useFeeInbox();
  return (
    <section
      aria-labelledby="fee-inbox-heading"
      style={{
        marginBottom: 24,
        padding: 24,
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        background: "white",
      }}
    >
      <h2 id="fee-inbox-heading">Thông báo hội phí ({items.length})</h2>
      <p>Hội viên đã gửi minh chứng thanh toán, đang chờ đối soát.</p>
      {error && <p role="status">{error}</p>}
      {!items.length && <p>Chưa có thông báo hội phí.</p>}
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => markRead(item.id)}
          style={{
            display: "block",
            padding: "16px 0",
            borderBottom: "1px solid #e2e8f0",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          <strong>
            {!readIds.includes(item.id) && "● "}
            {item.title}
          </strong>
          <p>{item.description}</p>
          <small>
            {new Date(item.createdAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            ·{" "}
            {item.status === "pending"
              ? "Chờ xác nhận"
              : item.status === "approved"
                ? "Đã xác nhận"
                : "Đã từ chối"}
          </small>
        </Link>
      ))}
    </section>
  );
}
