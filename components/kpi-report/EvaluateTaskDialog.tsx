"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  getKpiErrorMessage,
  kpiReportApi,
  type KpiReportTask,
} from "@/services/kpi-report";

import { EMPTY_VALUE, formatDateTime, formatNumber } from "./format";

type Decision = "COMPLETED" | "INCOMPLETE";

export default function EvaluateTaskDialog({
  task,
  onClose,
  onEvaluated,
}: {
  task: KpiReportTask;
  onClose: () => void;
  onEvaluated: () => void;
}) {
  const [decision, setDecision] = useState<Decision>("COMPLETED");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (decision === "INCOMPLETE" && !note.trim()) {
      setError("Vui lòng nhập ghi chú khi đánh giá chưa hoàn thành.");

      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await kpiReportApi.evaluateTask(task.id, {
        status: decision,
        note: note.trim() || undefined,
      });
      onEvaluated();
    } catch (cause) {
      setError(getKpiErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        aria-labelledby="evaluate-dialog-title"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-blue-950" id="evaluate-dialog-title">
              Chấm điểm công việc
            </h2>
            <p className="mt-1 text-sm text-slate-600">{task.title ?? EMPTY_VALUE}</p>
            <p className="mt-1 text-xs text-slate-500">
              Trọng số {formatNumber(task.points)} điểm · Nộp lúc{" "}
              {formatDateTime(task.submittedAt)}
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4 px-5 py-4" onSubmit={handleSubmit}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-slate-700">Kết quả đánh giá</legend>
            {(
              [
                {
                  value: "COMPLETED" as const,
                  label: "Hoàn thành",
                  hint: `Cộng ${formatNumber(task.points)} điểm`,
                },
                {
                  value: "INCOMPLETE" as const,
                  label: "Chưa hoàn thành",
                  hint: `Trừ ${formatNumber(task.points)} điểm, bắt buộc nhập ghi chú`,
                },
              ]
            ).map((option) => (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  decision === option.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                key={option.value}
              >
                <input
                  checked={decision === option.value}
                  className="mt-1"
                  name="decision"
                  onChange={() => setDecision(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    {option.label}
                  </span>
                  <span className="block text-xs text-slate-500">{option.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700">
              Ghi chú {decision === "INCOMPLETE" ? "(bắt buộc)" : "(tuỳ chọn)"}
            </span>
            <textarea
              className="min-h-24 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhận xét về kết quả thực hiện"
              required={decision === "INCOMPLETE"}
              value={note}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Huỷ
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Lưu đánh giá
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
