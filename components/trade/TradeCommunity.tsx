"use client";
import { useEffect, useState } from "react";
import { tradeAdminRequest, tradeAdminMedia } from "@/services/api/tradeApi";
import {
  businessTypeLabels,
  tradeNoticeLabels,
  type TradeReview,
  type TradeConversation,
  type TradeMessage,
  type TradeActor,
  type TradeNotice,
} from "@/services/trade-types";
import Image from "next/image";
import { useTradeAdmin, useTradeTask } from "./useTradeAdmin";
export default function TradeCommunity({
  kind,
  onOpenPost,
}: {
  kind: string;
  onOpenPost: (id: string) => void;
}) {
  const [page, setPage] = useState(1),
    [conversation, setConversation] = useState<TradeConversation | null>(null),
    [messages, setMessages] = useState<TradeMessage[]>([]),
    [messagePage, setMessagePage] = useState(1),
    [messageError, setMessageError] = useState("");
  const paths: Record<string, string> = {
    reviews: "reviews",
    conversations: "trade-conversations",
    users: "trade-users",
    notifications: "trade-notifications",
  };
  const list = useTradeAdmin<
      TradeReview | TradeConversation | TradeActor | TradeNotice
    >(paths[kind], { page, limit: 20 }),
    task = useTradeTask();
  useEffect(() => {
    if (!conversation) return;
    let cancelled = false;
    void tradeAdminRequest<TradeMessage[]>(
      "trade-conversations/" +
        conversation.id +
        "/messages?page=" +
        messagePage +
        "&limit=50",
    )
      .then((result) => {
        if (!cancelled) {
          setMessages(result.data);
          setMessageError("");
        }
      })
      .catch((e) => {
        if (!cancelled)
          setMessageError(
            e instanceof Error ? e.message : "Không đọc được hội thoại.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [conversation, messagePage]);
  return (
    <section>
      <div className="trade-actions">
        <button onClick={list.refresh}>Tải lại</button>
        <span>{list.meta?.total || 0} kết quả</span>
      </div>
      {(list.error || task.error || messageError) && (
        <p role="alert">{list.error || task.error || messageError}</p>
      )}
      {list.loading ? (
        <p>Đang tải…</p>
      ) : !list.rows.length ? (
        <div className="trade-card">Chưa có dữ liệu trong mục này.</div>
      ) : (
        <div className="trade-grid">
          {kind === "reviews" ? (
            (list.rows as TradeReview[]).map((review) => (
              <article className="trade-card" key={review.id}>
                <h2>
                  {review.user?.displayName || "Người quan tâm"} ·{" "}
                  {review.rating}/5
                </h2>
                <button
                  className="trade-link"
                  onClick={() => onOpenPost(review.tradePostId)}
                >
                  {review.post?.title || "Xem tin giao thương"}
                </button>
                <p>{review.content}</p>
                <div className="trade-gallery">
                  {review.images.map((image) => (
                    <Image
                      src={tradeAdminMedia(image.id)}
                      key={image.id}
                      alt="Ảnh đánh giá"
                      width={140}
                      height={100}
                      unoptimized
                    />
                  ))}
                </div>
                {review.replyContent && (
                  <blockquote>
                    <strong>Doanh nghiệp phản hồi</strong>
                    <p>{review.replyContent}</p>
                  </blockquote>
                )}
                {review.replies?.map((reply) => (
                  <blockquote key={reply.id}>{reply.content}</blockquote>
                ))}
                <p>
                  {review.status === "PUBLISHED" ? "Đang hiển thị" : "Đã ẩn"}
                </p>
                <div className="trade-actions">
                  <button
                    disabled={task.busy}
                    onClick={() =>
                      void task.run(async () => {
                        await tradeAdminRequest(
                          "reviews/" + review.id + "/status",
                          "PATCH",
                          {
                            status:
                              review.status === "PUBLISHED"
                                ? "HIDDEN"
                                : "PUBLISHED",
                          },
                        );
                        list.refresh();
                      })
                    }
                  >
                    {review.status === "PUBLISHED"
                      ? "Ẩn đánh giá"
                      : "Hiển thị đánh giá"}
                  </button>
                  <button
                    disabled={task.busy}
                    onClick={() => {
                      if (confirm("Xóa đánh giá này?"))
                        void task.run(async () => {
                          await tradeAdminRequest(
                            "reviews/" + review.id,
                            "DELETE",
                          );
                          list.refresh();
                        });
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))
          ) : kind === "conversations" ? (
            <>
              <div className="trade-card">
                <h2>Hội thoại kết nối</h2>
                <ul className="trade-items">
                  {(list.rows as TradeConversation[]).map((row) => (
                    <li key={row.id}>
                      <button
                        className="trade-link"
                        onClick={() => {
                          setConversation(row);
                          setMessagePage(1);
                        }}
                      >
                        <strong>{row.post?.title || "Tin giao thương"}</strong>
                      </button>
                      <small>
                        Cập nhật{" "}
                        {new Date(row.lastMessageAt).toLocaleString("vi-VN")}
                      </small>
                      <button
                        disabled={task.busy}
                        onClick={() => {
                          if (
                            confirm(
                              "Đóng hội thoại? Hai bên sẽ không thể gửi thêm hoặc mở lại hội thoại này.",
                            )
                          )
                            void task.run(async () => {
                              await tradeAdminRequest(
                                "trade-conversations/" + row.id,
                                "DELETE",
                              );
                              setConversation(null);
                              list.refresh();
                            });
                        }}
                      >
                        Đóng hội thoại
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {conversation && (
                <div className="trade-card">
                  <h2>{conversation.post?.title}</h2>
                  <p>
                    Nội dung hội thoại giữa hội viên và doanh nghiệp, chỉ xem để
                    hỗ trợ kiểm duyệt.
                  </p>
                  <div className="trade-messages">
                    {messages.map((message) => (
                      <article key={message.id}>
                        <strong>
                          {message.senderId === conversation.ownerId
                            ? "Doanh nghiệp"
                            : "Người quan tâm"}
                        </strong>
                        <p>{message.content}</p>
                        <small>
                          {new Date(message.createdAt).toLocaleString("vi-VN")}
                          {message.readAt ? " · Đã đọc" : ""}
                        </small>
                      </article>
                    ))}
                  </div>
                  <div className="trade-actions">
                    <button
                      disabled={messagePage === 1}
                      onClick={() => setMessagePage((p) => p - 1)}
                    >
                      Tin mới hơn
                    </button>
                    <button
                      disabled={messages.length < 50}
                      onClick={() => setMessagePage((p) => p + 1)}
                    >
                      Tin cũ hơn
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : kind === "users" ? (
            (list.rows as TradeActor[]).map((user) => (
              <article key={user.id} className="trade-card">
                <h2>{user.displayName}</h2>
                <p>
                  {user.status === "BLOCKED"
                    ? "Tài khoản đã khóa"
                    : "Tài khoản đang hoạt động"}
                </p>
                <label>
                  Loại hình doanh nghiệp
                  <select
                    disabled={task.busy}
                    value={user.businessType || "GENERAL"}
                    onChange={(e) => {
                      const value = e.target.value;
                      void task.run(async () => {
                        await tradeAdminRequest(
                          "trade-users/" + user.id,
                          "PATCH",
                          { businessType: value },
                        );
                        list.refresh();
                      });
                    }}
                  >
                    {Object.entries(businessTypeLabels).map(
                      ([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <button
                  disabled={task.busy}
                  onClick={() =>
                    void task.run(async () => {
                      await tradeAdminRequest(
                        "trade-users/" + user.id,
                        "PATCH",
                        {
                          status:
                            user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED",
                        },
                      );
                      list.refresh();
                    })
                  }
                >
                  {user.status === "BLOCKED"
                    ? "Mở khóa tài khoản"
                    : "Khóa tài khoản"}
                </button>
              </article>
            ))
          ) : (
            (list.rows as TradeNotice[]).map((notice) => (
              <article key={notice.id} className="trade-card">
                <h2>
                  {tradeNoticeLabels[notice.type] || "Cập nhật giao thương"}
                </h2>
                <p>{notice.title}</p>
                {notice.reason && <p>{notice.reason}</p>}
                <small>
                  {new Date(notice.createdAt).toLocaleString("vi-VN")}
                </small>
                <button onClick={() => onOpenPost(notice.tradePostId)}>
                  Xem tin
                </button>
              </article>
            ))
          )}
        </div>
      )}
      <div className="trade-actions">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Trang trước
        </button>
        <span>
          Trang {page}/{list.meta?.totalPages || 1}
        </span>
        <button
          disabled={page >= (list.meta?.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </button>
      </div>
    </section>
  );
}
