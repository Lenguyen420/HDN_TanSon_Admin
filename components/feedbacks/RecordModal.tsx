import { AdminRecord } from "@/services/feedback";
import { CrudField } from "./Feedback";
import { useState } from "react";
import stripReadonlyFields from "./stripReadonlyFields";
import type { FormEvent } from "react";
import buildPayload from "./buildPayload";
import FieldControl from "./FieldControl";
import { Loader2, Pencil, X } from "lucide-react";

export default function RecordModal({
  fields,
  isSaving,
  onClose,
  onSave,
  record,
}: {
  fields?: CrudField[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: AdminRecord) => Promise<void>;
  record: AdminRecord;
}) {
  const [json, setJson] = useState(() =>
    JSON.stringify(stripReadonlyFields(record), null, 2),
  );
  const [error, setError] = useState("");

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const payload = fields
        ? buildPayload(fields, new FormData(event.currentTarget))
        : (JSON.parse(json) as AdminRecord);

      await onSave(payload);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật bản ghi.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <section className="w-full max-w-2xl overflow-hidden rounded-md border border-[#dfe3e8] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#dfe3e8] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#0d6efd]">
              PATCH
            </p>
            <h2 className="text-base font-semibold text-[#182433]">
              Cập nhật bản ghi
            </h2>
          </div>
          <button
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#667085] hover:bg-[#f1f5f9]"
            onClick={onClose}
            title="Đóng"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submitEdit}>
          <div className="space-y-3 p-5">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {fields ? (
              fields.map((field) => (
                <FieldControl field={field} key={field.name} record={record} />
              ))
            ) : (
              <textarea
                className="min-h-[360px] w-full resize-y rounded-md border border-[#d8dee8] bg-[#f8fafc] px-3 py-3 font-mono text-sm leading-6 text-[#182433] outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#c7defd]"
                onChange={(event) => setJson(event.target.value)}
                value={json}
              />
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[#dfe3e8] bg-[#f8fafc] px-5 py-4">
            <button
              className="h-10 rounded-md border border-[#dfe3e8] bg-white px-4 text-sm font-medium text-[#182433] hover:bg-[#f1f5f9]"
              onClick={onClose}
              type="button"
            >
              Hủy
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0d6efd] px-4 text-sm font-semibold text-white hover:bg-[#0b5ed7] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              Lưu
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
