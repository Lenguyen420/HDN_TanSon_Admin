"use client";
import { useEffect, useState } from "react";
import { tradeAdminRequest } from "@/services/api/tradeApi";
import { tradeQuery, type TradeAnalytics } from "@/services/trade-types";
export default function TradeReports() {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [data, setData] = useState<TradeAnalytics | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const query = tradeQuery({
      from: from ? new Date(from + "T00:00:00").toISOString() : undefined,
      to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
    });
    void tradeAdminRequest<TradeAnalytics>(
      "trade-posts/analytics/summary" + query,
    )
      .then((result) => {
        if (!cancelled) {
          setData(result.data);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Không tải được thống kê.");
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);
  return (
    <section>
      <div className="trade-filters">
        <label>
          Từ ngày
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {data ? (
        <>
          <div className="trade-stats">
            {[
              ["Tin giao thương", data.postCount],
              ["Lượt xem", data.totals.views],
              ["Người xem riêng biệt", data.totals.uniqueVisitors],
              ["Liên hệ điện thoại", data.totals.contactPhone],
              ["Liên hệ Zalo", data.totals.contactZalo],
              ["Lượt chia sẻ", data.totals.share],
              ["Lượt lưu mới", data.totals.save],
              ["Đánh giá", data.reviews.count],
            ].map(([label, value]) => (
              <article className="trade-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <div className="trade-grid">
            <article className="trade-card">
              <h2>Tin được quan tâm nhiều nhất</h2>
              {data.topPosts.length ? (
                data.topPosts.map((row) => (
                  <p key={row.id}>
                    {row.title} <strong>{row.views} lượt xem</strong>
                  </p>
                ))
              ) : (
                <p>Chưa có lượt xem trong khoảng thời gian này.</p>
              )}
            </article>
            <article className="trade-card">
              <h2>Tương tác theo ngày</h2>
              <div className="trade-table">
                <table>
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Xem</th>
                      <th>Điện thoại</th>
                      <th>Zalo</th>
                      <th>Chia sẻ</th>
                      <th>Lưu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.timeseries.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{day.views}</td>
                        <td>{day.contactPhone}</td>
                        <td>{day.contactZalo}</td>
                        <td>{day.share}</td>
                        <td>{day.save}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </>
      ) : (
        <p>Đang tổng hợp số liệu…</p>
      )}
    </section>
  );
}
