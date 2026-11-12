"use client";
import EventParticipationList from "@/components/events/EventParticipationList";

import Image from "next/image";
import { imageUrl } from "@/services/image-url";
import { notify } from "@/lib/notify";
import { isEventFileUrl, eventFileHref } from "@/services/event-form";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSearch,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  getValue,
  type AssociationData,
  type AssociationRecord,
} from "@/services/association-store";
import {
  approveRegistrationOnBackend as approveRegistration,
  removeRecord as removeAssociationRecord,
  saveRecord as saveAssociationRecord,
  rejectRegistrationOnBackend,
  isBackendCollection,
} from "@/services/association-api";
import { labels, sections, statusLabels } from "./config";
import { useAssociationData } from "./useAssociationData";
import RecordDialog from "./RecordDialog";
import MemberAvatar from "./MemberAvatar";

export function formatDate(value: unknown) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text.split("-").reverse().join("/")
    : text || "—";
}
export const money = (value: unknown) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const normalize = (value: string) =>
  value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

export function StatusBadge({
  value,
  collection,
}: {
  value: string;
  collection?: string;
}) {
  const label =
    collection === "fees" && value === "pending"
      ? "Chờ thanh toán"
      : collection === "banners"
        ? value === "active"
          ? "Đang hiển thị"
          : "Đã ẩn"
        : statusLabels[value] || value;
  return (
    <span
      className={`status-badge status-${["active", "published", "approved", "paid", "attended", "Đã ghi nhận"].includes(value) ? "green" : ["pending", "registered", "Chờ xác nhận"].includes(value) ? "amber" : ["rejected", "absent", "cancelled"].includes(value) ? "red" : "gray"}`}
    >
      <i />
      {label}
    </span>
  );
}

function DetailDialog({
  record,
  section,
  data,
  onClose,
}: {
  record: AssociationRecord;
  section: string;
  data: AssociationData;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const config = sections[section];
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="record-dialog"
      aria-labelledby="detail-title"
      onCancel={onClose}
    >
      <div className="dialog-header">
        <div>
          <span className="eyebrow">
            CHI TIẾT {config.singular.toLocaleUpperCase("vi")}
          </span>
          <h2 id="detail-title">
            {String(
              record.name || record.fullName || record.title || record.alt,
            )}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Đóng chi tiết"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-body">
        <dl className="detail-grid">
          {config.fields.map((field) => {
            const value = getValue(record, field.key);
            const linked = field.source
              ? data.collections[field.source].find((item) => item.id === value)
              : null;
            return (
              <div
                key={field.key}
                className={
                  ["paragraphs", "textarea", "agenda", "event-files"].includes(
                    field.type || "",
                  )
                    ? "full-width"
                    : ""
                }
              >
                <dt>{field.label}</dt>
                <dd>
                  {field.key === "image" && value ? (
                    <Image
                      unoptimized
                      src={imageUrl(value)}
                      alt={String(
                        record.alt || record.title || "Hình ảnh nội dung",
                      )}
                      width={640}
                      height={320}
                      className="detail-image"
                    />
                  ) : field.type === "checkbox" ? (
                    value ? (
                      "Có"
                    ) : (
                      "Không"
                    )
                  ) : field.type === "agenda" && Array.isArray(value) ? (
                    value.map((item, index) => (
                      <p key={index}>
                        {item &&
                        typeof item === "object" &&
                        !Array.isArray(item)
                          ? `${item.time} — ${item.title}`
                          : ""}
                      </p>
                    ))
                  ) : field.type === "event-files" && Array.isArray(value) ? (
                    value.length ? (
                      value.map((item, index) => {
                        if (
                          !item ||
                          typeof item !== "object" ||
                          Array.isArray(item)
                        )
                          return null;
                        const url = String(item.url ?? "");
                        return (
                          <p key={String(item.id ?? index)}>
                            {isEventFileUrl(url) ? (
                              <a
                                href={eventFileHref(url)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {String(item.title)}
                              </a>
                            ) : (
                              String(item.title)
                            )}
                            {item.publishedAt
                              ? ` · ${formatDate(item.publishedAt)}`
                              : ""}
                          </p>
                        );
                      })
                    ) : (
                      "Chưa có file."
                    )
                  ) : Array.isArray(value) ? (
                    value.map((item, index) => (
                      <p key={index}>{String(item)}</p>
                    ))
                  ) : linked ? (
                    String(linked.name ?? linked.title)
                  ) : field.key === "amount" ? (
                    money(value)
                  ) : field.type === "date" ? (
                    formatDate(value)
                  ) : (
                    field.options?.find(([id]) => id === value)?.[1] ||
                    String(value ?? "—")
                  )}
                </dd>
              </div>
            );
          })}
          {section === "registrations" && (
            <>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <StatusBadge value={String(record.status)} />
                </dd>
              </div>
              {record.reviewedAt && (
                <div>
                  <dt>Thời điểm xử lý</dt>
                  <dd>
                    {new Date(String(record.reviewedAt)).toLocaleString(
                      "vi-VN",
                      { timeZone: "Asia/Ho_Chi_Minh" },
                    )}
                  </dd>
                </div>
              )}
              {record.rejectionReason && (
                <div className="full-width">
                  <dt>Lý do từ chối</dt>
                  <dd>{String(record.rejectionReason)}</dd>
                </div>
              )}
              {record.memberId && (
                <div>
                  <dt>Hội viên đã tạo</dt>
                  <dd>
                    {String(
                      data.collections.members.find(
                        (member) => member.id === record.memberId,
                      )?.name || "Hồ sơ hội viên được giữ trên máy chủ",
                    )}
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>
        {section === "events" && <EventParticipationList eventId={record.id} />}
      </div>
      <div className="dialog-footer">
        <button className="button button-secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
    </dialog>
  );
}

export default function CollectionPage({ section }: { section: string }) {
  const config = sections[section];
  const { data, error } = useAssociationData({
    collections: [
      config.collection,
      ...config.fields.flatMap((field) => (field.source ? [field.source] : [])),
    ],
  });
  const [query, setQuery] = useState("");
  const [notificationTarget, setNotificationTarget] = useState("");
  useEffect(() => {
    if (!["registrations", "events"].includes(section)) return;
    const target =
      new URLSearchParams(window.location.search).get(section === "events" ? "eventId" : "registrationId") || "";
    const timer = window.setTimeout(() => setNotificationTarget(target), 0);
    return () => window.clearTimeout(timer);
  }, [section]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{
    record: AssociationRecord | null;
  } | null>(null);
  const [detail, setDetail] = useState<AssociationRecord | null>(null);
  const [deleting, setDeleting] = useState<AssociationRecord | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<AssociationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const rejectDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (rejecting) rejectDialog.current?.showModal();
  }, [rejecting]);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (deleting) deleteDialog.current?.showModal();
  }, [deleting]);
  const records = useMemo(
    () =>
      (data?.collections[config.collection] || [])
        .filter((item) => !config.boardOnly || item.isBoard)
        .sort((a, b) =>
          config.collection === "banners"
            ? Number(a.order) - Number(b.order)
            : 0,
        ),
    [config, data],
  );
  const filtered = records
    .filter((item) => !notificationTarget || item.id === notificationTarget)
    .filter(
      (item) =>
        (!status || item.status === status) &&
        (!query ||
          normalize(
            JSON.stringify(item) +
              " " +
              String(
                data?.collections.members.find(
                  (member) => member.id === item.memberId,
                )?.name || "",
              ),
          ).includes(normalize(query))),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const statusOptions = [
    ...new Set(records.map((item) => String(item.status || ""))),
  ].filter(Boolean);

  async function run(action: () => void | Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      notify.success(message);
      setActionError("");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Không thể thực hiện thao tác.";
      setActionError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {config.boardOnly || ["members", "registrations"].includes(section)
              ? "CỘNG ĐỒNG DOANH NGHIỆP"
              : ["fees", "activities", "sponsorships"].includes(section)
                ? "ĐỒNG HÀNH CÙNG HỘI VIÊN"
                : "NỘI DUNG & HOẠT ĐỘNG"}
          </span>
          <h1>
            {config.title}
            <span className="count-label">{records.length}</span>
          </h1>
          <p>{config.description}</p>
        </div>
        <button
          className="button button-primary"
          disabled={!data || Boolean(error) || busy}
          onClick={() => setEditor({ record: null })}
        >
          <Plus size={17} />
          Thêm {config.singular}
        </button>
      </div>
      {notificationTarget && (
        <p role="status">
          {section === "events" ? "Đang xem sự kiện được chọn từ thông báo." : "Đang xem hồ sơ được chọn từ thông báo."}{" "}
          <button
            type="button"
            className="button"
            onClick={() => {
              setNotificationTarget("");
              setPage(1);
            }}
          >
            Xem tất cả
          </button>
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="collection-summary">
        <div>
          <span>Tổng {config.singular}</span>
          <strong>{records.length}</strong>
        </div>
        <div>
          <span>
            {section === "fees"
              ? "Đã thu"
              : section === "members"
                ? "Đang hoạt động"
                : section === "registrations"
                  ? "Chờ duyệt"
                  : "Đang ghi nhận"}
          </span>
          <strong>
            {section === "fees"
              ? money(
                  records
                    .filter((item) => item.status === "paid")
                    .reduce((sum, item) => sum + Number(item.amount), 0),
                )
              : records.filter((item) =>
                  section === "registrations"
                    ? item.status === "pending"
                    : ![
                        "draft",
                        "inactive",
                        "rejected",
                        "cancelled",
                        "absent",
                      ].includes(String(item.status)),
                ).length}
          </strong>
        </div>
        <div>
          <span>Phạm vi dữ liệu</span>
          <strong className="summary-text">
            {isBackendCollection(config.collection)
              ? "MongoDB của Hội"
              : "Lưu trên trình duyệt"}
          </strong>
        </div>
      </div>
      <section
        className="panel collection-panel"
        aria-label={`Danh sách ${config.title}`}
      >
        <div className="list-toolbar">
          <div className="table-search">
            <Search size={17} />
            <input
              aria-label={`Tìm ${config.singular}`}
              placeholder={`Tìm ${config.singular}…`}
              value={query}
              onChange={(event) => {
                setNotificationTarget("");
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {statusOptions.map((value) => (
              <option key={value} value={value}>
                {section === "fees" && value === "pending"
                  ? "Chờ thanh toán"
                  : statusLabels[value] || value}
              </option>
            ))}
          </select>
        </div>
        {!data && !error ? (
          <div className="empty-state" role="status">
            Đang tải dữ liệu…
          </div>
        ) : !visible.length ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FileSearch size={30} />
            </div>
            <h2>
              {query || status
                ? "Không tìm thấy kết quả"
                : `Chưa có ${config.singular}`}
            </h2>
            <p>
              {query || status
                ? "Thử tìm với từ khóa khác hoặc bỏ bộ lọc."
                : "Thêm bản ghi đầu tiên để bắt đầu quản lý."}
            </p>
            {(query || status) && (
              <button
                className="button button-secondary"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th scope="col" key={column}>
                      {labels[column] || column}
                    </th>
                  ))}
                  <th scope="col" className="action-heading">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    {config.columns.map((column, index) => {
                      const value = getValue(record, column);
                      const memberName = data?.collections.members.find(
                        (member) => member.id === value,
                      )?.name;
                      return (
                        <td key={column}>
                          {column === "status" ? (
                            <StatusBadge
                              value={String(value)}
                              collection={section}
                            />
                          ) : column === "amount" ? (
                            <strong className="amount">{money(value)}</strong>
                          ) : column === "memberId" ? (
                            String(memberName || "Không tìm thấy hội viên")
                          ) : column === "kind" ? (
                            statusLabels[String(value)]
                          ) : column === "image" && value ? (
                            <Image
                              unoptimized
                              src={imageUrl(value)}
                              alt={String(record.alt || "Banner")}
                              width={100}
                              height={56}
                              className="table-thumbnail"
                            />
                          ) : column.toLowerCase().includes("date") ||
                            column === "joinedAt" ||
                            column === "publishedAt" ? (
                            formatDate(value)
                          ) : index === 0 ? (
                            <button
                              className="record-title"
                              onClick={() => setDetail(record)}
                            >
                              {["name", "fullName"].includes(column) && (
                                <MemberAvatar
                                  name={String(value || "")}
                                  avatar={record.avatar}
                                />
                              )}
                              <span>
                                {String(value ?? "—")}
                                {column === "name" && (
                                  <small>
                                    {String(record.position || "Hội viên")}
                                  </small>
                                )}
                              </span>
                            </button>
                          ) : (
                            String(value ?? "—")
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <div className="row-actions">
                        {section === "registrations" &&
                          record.status === "pending" && (
                            <>
                              <button
                                className="icon-button approve-button"
                                disabled={busy}
                                title="Duyệt hồ sơ"
                                aria-label={`Duyệt ${record.fullName}`}
                                onClick={() =>
                                  run(
                                    () => approveRegistration(record.id),
                                    "Đã duyệt hồ sơ và thêm vào danh sách hội viên.",
                                  )
                                }
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="icon-button danger-button"
                                disabled={busy}
                                title="Từ chối hồ sơ"
                                aria-label={`Từ chối ${record.fullName}`}
                                onClick={() => {
                                  setRejectionReason("");
                                  setActionError("");
                                  setRejecting(record);
                                }}
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        <button
                          className="icon-button"
                          title="Xem chi tiết"
                          aria-label={`Xem ${record.name || record.fullName || record.title || record.alt}`}
                          onClick={() => setDetail(record)}
                        >
                          <Eye size={16} />
                        </button>
                        {(section !== "registrations" ||
                          record.status === "pending") && (
                          <button
                            className="icon-button"
                            disabled={busy}
                            title="Chỉnh sửa"
                            aria-label={`Sửa ${record.name || record.fullName || record.title || record.alt}`}
                            onClick={() => setEditor({ record })}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {(section !== "registrations" ||
                          record.status !== "approved") && (
                          <button
                            className="icon-button danger-button"
                            title="Xóa"
                            aria-label={`Xóa ${record.name || record.fullName || record.title || record.alt}`}
                            onClick={() => {
                              setActionError("");
                              setDeleting(record);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, filtered.length)}`
              : 0}{" "}
            / {filtered.length} bản ghi
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Trang trước"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Trang {currentPage} / {pages}
            </span>
            <button
              className="icon-button"
              aria-label="Trang sau"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
      {editor && data && (
        <RecordDialog
          config={config}
          record={editor.record}
          data={data}
          onClose={() => setEditor(null)}
          onSaved={() => {
            notify.success(
              isBackendCollection(config.collection)
                ? "Đã lưu thay đổi lên MongoDB."
                : "Đã lưu thay đổi trên trình duyệt.",
            );
            setActionError("");
          }}
        />
      )}
      {detail && data && (
        <DetailDialog
          record={detail}
          section={section}
          data={data}
          onClose={() => setDetail(null)}
        />
      )}
      {deleting && (
        <dialog
          ref={deleteDialog}
          className="record-dialog confirm-dialog"
          aria-labelledby="delete-title"
          onCancel={() => setDeleting(null)}
        >
          <div className="dialog-header">
            <h2 id="delete-title">
              {config.boardOnly
                ? "Đưa khỏi Ban chấp hành?"
                : `Xóa ${config.singular}?`}
            </h2>
          </div>
          <div className="dialog-body">
            <p>
              Bản ghi “
              {String(
                deleting.name ||
                  deleting.fullName ||
                  deleting.title ||
                  deleting.alt,
              )}
              ”{" "}
              {config.boardOnly
                ? "sẽ được chuyển về vai trò Hội viên. Hồ sơ và lịch sử vẫn được giữ lại."
                : isBackendCollection(config.collection)
                  ? "sẽ được ẩn khỏi danh sách. Dữ liệu được giữ trên máy chủ."
                  : "sẽ bị xóa khỏi dữ liệu trên trình duyệt này."}
            </p>
            {actionError && (
              <p className="error-message" role="alert">
                {actionError}
              </p>
            )}
          </div>
          <div className="dialog-footer">
            <button
              className="button button-secondary"
              onClick={() => setDeleting(null)}
            >
              Hủy
            </button>
            <button
              className="button button-danger"
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    if (config.boardOnly) {
                      await saveAssociationRecord("members", {
                        ...deleting,
                        isBoard: false,
                        position: "Hội viên",
                      });
                    } else {
                      await removeAssociationRecord(
                        config.collection,
                        deleting.id,
                      );
                    }
                    setDeleting(null);
                  },
                  config.boardOnly
                    ? "Đã cập nhật vai trò hội viên."
                    : "Đã xóa bản ghi.",
                )
              }
            >
              <Trash2 size={16} />
              {config.boardOnly ? "Xác nhận thay đổi" : "Xóa bản ghi"}
            </button>
          </div>
        </dialog>
      )}
      {rejecting && (
        <dialog
          ref={rejectDialog}
          className="record-dialog confirm-dialog"
          aria-labelledby="reject-title"
          onCancel={() => {
            if (!busy) setRejecting(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await rejectRegistrationOnBackend(
                  rejecting.id,
                  rejectionReason,
                );
                setRejecting(null);
              }, "Đã từ chối hồ sơ và lưu kết quả trên MongoDB.");
            }}
          >
            <div className="dialog-header">
              <h2 id="reject-title">Từ chối hồ sơ</h2>
            </div>
            <div className="dialog-body">
              <p>
                {String(rejecting.fullName)} · {String(rejecting.company)}
              </p>
              <label className="form-field">
                <span>Lý do từ chối (không bắt buộc)</span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  disabled={busy}
                />
              </label>
              {actionError && (
                <p role="alert" className="error-message">
                  {actionError}
                </p>
              )}
            </div>
            <div className="dialog-footer">
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={() => setRejecting(null)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="button button-danger"
                disabled={busy}
              >
                {busy ? "Đang xử lý…" : "Xác nhận từ chối"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
