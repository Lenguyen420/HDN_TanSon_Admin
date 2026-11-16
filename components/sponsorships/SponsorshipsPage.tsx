"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { imageUrl } from "@/services/image-url";
import {
  partnerApi as api,
  money,
  type Partner,
  type Contribution,
  type Summary,
} from "@/services/api/partnerApi";
import PartnerEditor from "./PartnerEditor";
import styles from "./partners.module.css";
function SponsorshipsWorkspace({
  partnerParam,
  contributionParam,
}: {
  partnerParam: string | null;
  contributionParam: string | null;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("amount"),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Partner[]>([]),
    [selected, setSelected] = useState<Partner>(),
    [selectedId, setSelectedId] = useState<string | undefined>(
      partnerParam || undefined,
    ),
    [historyPage, setHistoryPage] = useState(1),
    [historyTotal, setHistoryTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>(),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{
    mode: "partner" | "contribution";
    partner?: Partner;
    contribution?: Contribution;
  }>();
  const refresh = () => setRevision((n) => n + 1);
  useEffect(() => {
    const c = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const params: Record<string, string | number> = {
        search,
        page,
        limit: 20,
        sort,
      };
      if (status) params.isPublished = status;
      const dates: Record<string, string> = {};
      if (from) dates.from = from;
      if (to) dates.to = to;
      void Promise.all([
        api.list(params, c.signal),
        api.statistics(dates, c.signal),
        selectedId
          ? api.detail(
              selectedId,
              historyPage,
              c.signal,
              contributionParam || undefined,
            )
          : Promise.resolve(undefined),
      ])
        .then(([list, stats, detail]) => {
          if (c.signal.aborted) return;
          setRows(list.data);
          setTotal(list.pagination.total);
          setSummary(stats);
          if (detail) {
            const target = detail.data.selectedContribution;
            setSelected(
              target &&
                !detail.data.contributions?.some(
                  (item) => item.id === target.id,
                )
                ? {
                    ...detail.data,
                    contributions: [
                      target,
                      ...(detail.data.contributions || []),
                    ],
                  }
                : detail.data,
            );
            setHistoryTotal(detail.pagination.total);
          } else setSelected(undefined);
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [
    search,
    status,
    sort,
    page,
    from,
    to,
    selectedId,
    historyPage,
    revision,
    contributionParam,
  ]);

  useEffect(() => {
    if (selected && contributionParam)
      document
        .getElementById("contribution-" + contributionParam)
        ?.scrollIntoView({ block: "center" });
  }, [selected, contributionParam]);
  async function act(
    action: () => Promise<unknown>,
    message?: string,
    deletedPartner = false,
  ) {
    if (busy || (message && !window.confirm(message))) return;
    setBusy(true);
    setError("");
    try {
      await action();
      if (deletedPartner) {
        setSelectedId(undefined);
        setSelected(undefined);
      }
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell activeHref="/admin/sponsorships">
      <div className={styles.page}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>HỘI PHÍ & ĐÓNG GÓP</p>
            <h1>Đơn vị đồng hành</h1>
            <p>Ghi nhận sự đồng hành của doanh nghiệp với Hội.</p>
          </div>
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() =>
              setEditor({
                mode: selected ? "contribution" : "partner",
                partner: selected,
              })
            }
          >
            + {selected ? "Thêm khoản đóng góp" : "Thêm đơn vị"}
          </button>
        </div>
        <div className={styles.stats}>
          {[
            ["Đơn vị", summary?.totalPartners],
            ["Tiền tài trợ công khai", money(summary?.totalAmount || 0)],
            ["Lượt đóng góp", summary?.contributionCount],
            ["Lượt hiện vật", summary?.inKindCount],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value ?? "—"}</strong>
            </div>
          ))}
        </div>
        <section className={styles.panel}>
          <div className={styles.filters}>
            <label className="form-field">
              <span>Từ ngày</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Đến ngày</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              className="button button-secondary"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Xóa lọc ngày
            </button>
          </div>
          <p className={styles.hint}>
            Thống kê tiền và lượt tài trợ chỉ tính các khoản công khai thuộc đơn
            vị công khai, theo ngày đóng góp. Hiện vật không cộng vào tổng tiền.
            Giá trị hiện vật ước tính: {money(summary?.estimatedValue || 0)}.
          </p>
          <details>
            <summary>Thống kê theo đơn vị</summary>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Đơn vị</th>
                    <th>Tiền tài trợ</th>
                    <th>Lượt đóng góp</th>
                    <th>Lượt hiện vật</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.byPartner?.map((row) => (
                    <tr key={row.partnerId}>
                      <td>
                        <button
                          className={styles.link}
                          onClick={() => {
                            setSelectedId(row.partnerId);
                            setHistoryPage(1);
                          }}
                        >
                          {row.name}
                        </button>
                      </td>
                      <td>{money(row.totalAmount)}</td>
                      <td>{row.contributionCount}</td>
                      <td>{row.inKindCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        {error && (
          <div role="alert" className="error-message">
            {error}{" "}
            <button className="button button-secondary" onClick={refresh}>
              Thử lại
            </button>
          </div>
        )}
        {loading && <p role="status">Đang tải dữ liệu…</p>}
        {selectedId ? (
          selected && (
            <section className={styles.panel} aria-busy={loading}>
              <button
                className="button button-secondary"
                onClick={() => {
                  setSelectedId(undefined);
                  setSelected(undefined);
                }}
              >
                ← Danh sách đơn vị
              </button>
              <div className={styles.heading}>
                <div>
                  <h2>{selected.name}</h2>
                  <p>
                    {selected.industry} ·{" "}
                    {selected.isPublished ? "Công khai" : "Đang ẩn"}
                  </p>
                  <p>{selected.description}</p>
                  <p>{selected.address}</p>
                  {selected.website && (
                    <a href={selected.website} target="_blank" rel="noreferrer">
                      {selected.website}
                    </a>
                  )}
                  <p>
                    <strong>{money(selected.totalAmount)}</strong> ·{" "}
                    {selected.contributionCount} lượt công khai
                  </p>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() =>
                    setEditor({ mode: "partner", partner: selected })
                  }
                >
                  Sửa đơn vị
                </button>
              </div>
              <h2>Lịch sử đóng góp</h2>
              <div className={styles.history}>
                {selected.contributions?.map((c) => (
                  <article
                    key={c.id}
                    id={"contribution-" + c.id}
                    className={styles.contribution}
                  >
                    <div className={styles.heading}>
                      <div>
                        <h3>{c.title}</h3>
                        <p>
                          {c.contributionDate} ·{" "}
                          {c.isPublished ? "Công khai" : "Đang ẩn"}
                        </p>
                        <strong>
                          {c.type === "money"
                            ? money(c.amount)
                            : `${c.itemName} · ${c.quantity}`}
                        </strong>
                        {c.type === "in_kind" && c.estimatedValue !== null && (
                          <p>Giá trị ước tính: {money(c.estimatedValue)}</p>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <button
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() =>
                            setEditor({
                              mode: "contribution",
                              partner: selected,
                              contribution: c,
                            })
                          }
                        >
                          Sửa
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() =>
                            void act(() =>
                              api.updateContribution(c.id, {
                                isPublished: !c.isPublished,
                              }),
                            )
                          }
                        >
                          {c.isPublished ? "Ẩn" : "Công bố"}
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              () => api.removeContribution(c.id),
                              "Xóa mềm khoản đóng góp này?",
                            )
                          }
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                    <p className={styles.prose}>{c.description}</p>
                    {c.eventId && <p>Sự kiện: {c.eventId}</p>}
                    <div className={styles.images}>
                      {c.images.map((src) => (
                        <a
                          key={src}
                          href={imageUrl(src)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Image
                            src={imageUrl(src)}
                            width={120}
                            height={90}
                            unoptimized
                            alt="Ảnh công khai khoản đóng góp"
                          />
                        </a>
                      ))}
                    </div>
                    <p className={styles.hint}>
                      Thông báo:{" "}
                      {c.notification?.status === "sent"
                        ? "Đã gửi"
                        : c.notification?.status === "failed"
                          ? "Gửi thất bại"
                          : "Chưa gửi"}{" "}
                      {c.notification?.error}
                    </p>
                    <details>
                      <summary>Lịch sử thao tác</summary>
                      {c.audit?.map((a, i) => (
                        <p key={i}>
                          {a.at} · {a.actorId} · {a.action}
                        </p>
                      ))}
                    </details>
                  </article>
                ))}
              </div>
              {!selected.contributions?.length && !loading && (
                <p>Chưa có khoản đóng góp.</p>
              )}
              <div className={styles.actions}>
                <button
                  className="button button-secondary"
                  disabled={historyPage === 1 || loading}
                  onClick={() => setHistoryPage((n) => n - 1)}
                >
                  Trước
                </button>
                <span>
                  Trang {historyPage} · {historyTotal} khoản
                </span>
                <button
                  className="button button-secondary"
                  disabled={historyPage * 20 >= historyTotal || loading}
                  onClick={() => setHistoryPage((n) => n + 1)}
                >
                  Sau
                </button>
              </div>
              <details>
                <summary>Lịch sử đơn vị</summary>
                {selected.audit?.map((a, i) => (
                  <p key={i}>
                    {a.at} · {a.actorId} · {a.action}
                  </p>
                ))}
              </details>
            </section>
          )
        ) : (
          <section className={styles.panel} aria-busy={loading}>
            <div className={styles.filters}>
              <input
                aria-label="Tìm tên đơn vị"
                placeholder="Tìm tên đơn vị…"
                maxLength={150}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <select
                aria-label="Trạng thái"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Công khai</option>
                <option value="false">Đang ẩn</option>
              </select>
              <select
                aria-label="Sắp xếp"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="amount">Tiền lũy kế</option>
                <option value="updated">Cập nhật mới</option>
                <option value="name">Tên đơn vị</option>
              </select>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Đơn vị</th>
                    <th>Tiền lũy kế công khai</th>
                    <th>Lượt</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className={styles.name}>
                          {row.logo && (
                            <Image
                              src={imageUrl(row.logo)}
                              width={44}
                              height={44}
                              unoptimized
                              alt=""
                            />
                          )}
                          <button
                            className={styles.link}
                            onClick={() => {
                              setSelectedId(row.id);
                              setHistoryPage(1);
                            }}
                          >
                            {row.name}
                          </button>
                        </div>
                      </td>
                      <td>{money(row.totalAmount)}</td>
                      <td>{row.contributionCount}</td>
                      <td>{row.isPublished ? "Công khai" : "Đang ẩn"}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className="button button-secondary"
                            onClick={() =>
                              setEditor({ mode: "partner", partner: row })
                            }
                          >
                            Sửa
                          </button>
                          <button
                            className="button button-secondary"
                            disabled={busy}
                            onClick={() =>
                              void act(() =>
                                api.update(row.id, {
                                  isPublished: !row.isPublished,
                                }),
                              )
                            }
                          >
                            {row.isPublished ? "Ẩn" : "Công bố"}
                          </button>
                          <button
                            className="button button-secondary"
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () => api.remove(row.id),
                                "Xóa mềm đơn vị và ngừng hiển thị mọi khoản đóng góp của đơn vị này?",
                                true,
                              )
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && !rows.length && <p>Chưa có đơn vị phù hợp.</p>}
            <div className={styles.actions}>
              <button
                className="button button-secondary"
                disabled={page === 1 || loading}
                onClick={() => setPage((n) => n - 1)}
              >
                Trước
              </button>
              <span>
                Trang {page} · {total} đơn vị
              </span>
              <button
                className="button button-secondary"
                disabled={page * 20 >= total || loading}
                onClick={() => setPage((n) => n + 1)}
              >
                Sau
              </button>
            </div>
          </section>
        )}
        {editor && (
          <PartnerEditor
            key={editor.contribution?.id || editor.partner?.id || "new"}
            {...editor}
            onClose={() => setEditor(undefined)}
            onSaved={refresh}
          />
        )}
      </div>
    </AppShell>
  );
}

function SponsorshipsEntry() {
  const query = useSearchParams();
  return (
    <SponsorshipsWorkspace
      key={query.toString()}
      partnerParam={query.get("partnerId")}
      contributionParam={query.get("contributionId")}
    />
  );
}
export default function SponsorshipsPage() {
  return (
    <Suspense fallback={<p>Đang tải đơn vị đồng hành…</p>}>
      <SponsorshipsEntry />
    </Suspense>
  );
}
