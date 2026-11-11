"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileJson,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  createResource,
  deleteResource,
  getRecordId,
  getResourceById,
  listResource,
  updateResource,
} from "@/services/feedback";
import type { AdminRecord } from "@/services/feedback";
import buildPayload from "./buildPayload";
import RecordModal from "./RecordModal";
import formatValue from "./formatValue";
import RecordDetailModal from "./RecordDetailModal";

export type CrudField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "password"
    | "textarea"
    | "select"
    | "json"
    | "datetime-local"
    | "checkbox";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  helper?: string;
};

export type CrudAdminConfig = {
  activeHref: string;
  title: string;
  eyebrow: string;
  description: string;
  resource: string;
  createTitle: string;
  listTitle: string;
  emptyText: string;

  columns: {
    key: string;
    label: string;
  }[];

  fields: CrudField[];

  editFields?: CrudField[];

  showCreateForm?: boolean;
  mockData?: AdminRecord[];
};

type Notice = {
  kind: "success" | "error" | "info";
  message: string;
};

function readValue(record: AdminRecord, key: string) {
  return key.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, record);
}

function ResourceIcon({ resource }: { resource: string }) {
  const Icon =
    resource === "users"
      ? Users
      : resource === "feedback-types"
        ? Tags
        : MessageSquareText;

  return <Icon className="h-5 w-5" />;
}

export function ResourceCrudPanel({
  config,
  showHeader = true,
}: {
  config: CrudAdminConfig;
  showHeader?: boolean;
}) {
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(
    null,
  );
  const [detailRecord, setDetailRecord] = useState<AdminRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    kind: "info",
    message: "Đang tải dữ liệu từ backend...",
  });
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const usesServerSearch = config.resource === "feedbacks";

  const getLoadSuccessMessage = useCallback(
    (data: AdminRecord[]) => {
      return `Đã tải ${data.length} bản ghi từ /${config.resource}.`;
    },
    [config.resource],
  );

  const getLoadErrorMessage = useCallback(
    (error: unknown) => {
      return error instanceof Error
        ? error.message
        : `Không tải được dữ liệu /${config.resource}.`;
    },
    [config.resource],
  );
  async function loadItems(nextQuery = usesServerSearch ? debouncedQuery : "") {
    setIsLoading(true);

    try {
      const data = await listResource(
        config.resource,
        usesServerSearch
          ? {
              keyword: nextQuery.trim() || undefined,
              size: 200,
            }
          : undefined,
      );
      console.log("list record", data);
      setItems(data);

      setNotice({
        kind: "success",
        message: getLoadSuccessMessage(data),
      });
    } catch (error) {
      setItems([]);

      setNotice({
        kind: "error",
        message: getLoadErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialItems() {
      try {
      const data = await listResource(config.resource);
        console.log("list record", data);

        if (!isMounted) {
          return;
        }

        setItems(data);

        setNotice({
          kind: "success",
          message: getLoadSuccessMessage(data),
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setItems([]);

        setNotice({
          kind: "error",
          message: getLoadErrorMessage(error),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialItems();

    return () => {
      isMounted = false;
    };
  }, [config.resource, getLoadErrorMessage, getLoadSuccessMessage]);

  useEffect(() => {
    if (!usesServerSearch) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, usesServerSearch]);

  useEffect(() => {
    if (!usesServerSearch) {
      return;
    }

    let isMounted = true;

    async function searchItems() {
      setIsLoading(true);

      try {
        const data = await listResource(config.resource, {
          keyword: debouncedQuery.trim() || undefined,
          size: 200,
        });

        if (!isMounted) {
          return;
        }

        setItems(data);
        setNotice({
          kind: "success",
          message: getLoadSuccessMessage(data),
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setItems([]);
        setNotice({
          kind: "error",
          message: getLoadErrorMessage(error),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void searchItems();

    return () => {
      isMounted = false;
    };
  }, [
    config.resource,
    debouncedQuery,
    getLoadErrorMessage,
    getLoadSuccessMessage,
    usesServerSearch,
  ]);

  const filteredItems = useMemo(() => {
    if (usesServerSearch) {
      return items;
    }

    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(keyword),
    );
  }, [items, query, usesServerSearch]);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const form = event.currentTarget;

    try {
      const payload = buildPayload(config.fields, new FormData(form));
      const created = await createResource(config.resource, payload);

      setItems((current) => [created, ...current]);
      form.reset();
      setNotice({
        kind: "success",
        message: `Đã tạo bản ghi mới trong /${config.resource}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Không tạo được bản ghi.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function openDetail(record: AdminRecord) {
    const id = getRecordId(record);

    if (id === undefined) {
      setDetailRecord(record);
      return;
    }

    try {
      const detail = await getResourceById(config.resource, id);
      setDetailRecord(detail);
    } catch {
      setDetailRecord(record);
    }
  }

  async function saveSelectedRecord(payload: AdminRecord) {
    if (!selectedRecord) {
      return;
    }

    const id = getRecordId(selectedRecord);

    if (id === undefined) {
      throw new Error("Bản ghi không có id để cập nhật.");
    }

    setIsSaving(true);

    try {
      const updated = await updateResource(config.resource, id, payload);
      setItems((current) =>
        current.map((item) => (getRecordId(item) === id ? updated : item)),
      );
      setSelectedRecord(null);
      setNotice({
        kind: "success",
        message: `Đã cập nhật bản ghi #${id}.`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function removeRecord(record: AdminRecord) {
    const id = getRecordId(record);

    if (id === undefined) {
      setNotice({
        kind: "error",
        message: "Bản ghi không có id để xóa.",
      });
      return;
    }

    const confirmed = window.confirm(`Xóa bản ghi #${id}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteResource(config.resource, id);
      setItems((current) => current.filter((item) => getRecordId(item) !== id));
      setNotice({
        kind: "success",
        message: `Đã xóa bản ghi #${id}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Không xóa được bản ghi.",
      });
    }
  }

  const noticeClassName = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  }[notice.kind];

  return (
    <section className="space-y-6">
      {showHeader ? (
        <section className="overflow-hidden rounded-[28px] border border-blue-900/10 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />

          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-yellow-200">
                  {config.eyebrow}
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  {config.title}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  {config.description}
                </p>
              </div>

              <button
                aria-label="Tải lại"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-400 px-5 py-3 text-sm font-bold text-blue-950 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={() => void loadItems()}
                type="button"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isLoading ? "Đang tải dữ liệu..." : "Làm mới dữ liệu"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Tổng bản ghi
          </p>
          <p className="mt-3 text-3xl font-extrabold text-blue-950">
            {items.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu đang quản lý trong hệ thống
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
            Đang hiển thị
          </p>
          <p className="mt-3 text-3xl font-extrabold text-blue-950">
            {filteredItems.length}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Kết quả sau khi lọc tìm kiếm
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
            API dữ liệu
          </p>
          <p className="mt-3 truncate text-2xl font-extrabold text-blue-950">
            /{config.resource}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Nguồn dữ liệu backend đang sử dụng
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <div
            className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${noticeClassName}`}
          >
            {notice.kind === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                GET /{config.resource}
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                {config.listTitle}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Đang hiển thị {filteredItems.length} / {items.length} bản ghi.
              </p>
            </div>

            <label className="relative block w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm trong dữ liệu..."
                value={query}
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto p-6">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-blue-950 text-white">
                {config.columns.map((column, index) => (
                  <th
                    className={`px-4 py-4 font-bold ${
                      index === 0 ? "rounded-l-xl" : ""
                    }`}
                    key={column.key}
                  >
                    {column.label}
                  </th>
                ))}

                <th className="rounded-r-xl px-4 py-4 text-right font-bold">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {!isLoading
                ? filteredItems.map((item, index) => {
                    const id = getRecordId(item) ?? `row-${index}`;

                    return (
                      <tr
                        className="align-top text-slate-700 transition hover:bg-blue-50/60"
                        key={String(id)}
                      >
                        {config.columns.map((column) => (
                          <td
                            className="max-w-[320px] border-b border-slate-100 px-4 py-4 text-sm text-slate-700"
                            key={column.key}
                          >
                            <span className="line-clamp-3 break-words">
                              {formatValue(readValue(item, column.key))}
                            </span>
                          </td>
                        ))}

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              aria-label="Xem chi tiết"
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-800 transition hover:bg-blue-50"
                              onClick={() => openDetail(item)}
                              title="Xem chi tiết"
                              type="button"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              aria-label="Sửa"
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-200 bg-white text-yellow-700 transition hover:bg-yellow-50"
                              onClick={() => setSelectedRecord(item)}
                              title="Sửa"
                              type="button"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              aria-label="Xóa"
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                              onClick={() => removeRecord(item)}
                              title="Xóa"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
              <ResourceIcon resource={config.resource} />
            </div>

            <p className="mt-4 font-bold text-blue-950">{config.emptyText}</p>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Thử tải lại dữ liệu hoặc kiểm tra điều kiện tìm kiếm hiện tại.
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải dữ liệu...
          </div>
        ) : null}
      </section>

      {selectedRecord ? (
        <RecordModal
          fields={config.editFields}
          isSaving={isSaving}
          onClose={() => setSelectedRecord(null)}
          onSave={saveSelectedRecord}
          record={selectedRecord}
        />
      ) : null}

      {detailRecord ? (
        <RecordDetailModal
          onClose={() => setDetailRecord(null)}
          record={detailRecord}
        />
      ) : null}
    </section>
  );
}

export default function CrudAdminPage({ config }: { config: CrudAdminConfig }) {
  return (
    <main className="mx-auto max-w-[1288px] px-4 py-6">
      <ResourceCrudPanel config={config} />
    </main>
  );
}
