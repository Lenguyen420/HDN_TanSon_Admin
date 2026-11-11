"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import {
  getValue,
  setValue,
  type AssociationData,
  type AssociationRecord,
  type RecordValue,
} from "@/services/association-store";
import { saveRecord, isBackendCollection } from "@/services/association-api";
import { notify } from "@/lib/notify";
import type { SectionConfig } from "./config";
import ImagePicker, { readSelectedImage } from "./ImagePicker";
import TopicPicker from "./TopicPicker";

export default function RecordDialog({
  config,
  record,
  data,
  onClose,
  onSaved,
}: {
  config: SectionConfig;
  record: AssociationRecord | null;
  data: AssociationData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const next: AssociationRecord = record
      ? structuredClone(record)
      : { id: crypto.randomUUID() };
    try {
      for (const field of config.fields) {
        const text =
          field.type === "image"
            ? await readSelectedImage(form, field.key)
            : String(form.get(field.key) ?? "").trim();
        if (field.required && field.type !== "checkbox" && !text)
          throw new Error(
            `Vui lòng nhập ${field.label.toLocaleLowerCase("vi")}.`,
          );
        let value: RecordValue =
          field.type === "checkbox"
            ? form.has(field.key)
            : field.type === "number"
              ? text
                ? Number(text)
                : null
              : text;
        if (
          field.type === "number" &&
          (typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < (field.min ?? 0))
        )
          throw new Error(`${field.label} không hợp lệ.`);
        if (field.type === "paragraphs")
          value = text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        if (field.type === "agenda")
          value = text
            ? text
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => {
                  const separator = line.indexOf("|");
                  if (separator < 1 || !line.slice(separator + 1).trim())
                    throw new Error(
                      "Mỗi dòng lịch trình cần có dạng: 08:00 | Đón tiếp hội viên.",
                    );
                  return {
                    time: line.slice(0, separator).trim(),
                    title: line.slice(separator + 1).trim(),
                  };
                })
            : [];
        setValue(next, field.key, value);
      }
      if (config.collection === "members") {
        if (config.boardOnly) next.isBoard = true;
        next.initials = String(next.name)
          .split(/\s+/)
          .slice(-2)
          .map((word) => word[0])
          .join("")
          .toLocaleUpperCase("vi");
      }
      if (config.collection === "registrations" && !record)
        next.status = "pending";
      if (config.collection === "activities") {
        const event = data.collections.events.find(
          (item) => item.id === next.eventId,
        );
        if (!event) throw new Error("Vui lòng chọn sự kiện còn tồn tại.");
        next.title = event.title;
        next.date = getValue(event, "event.date");
        next.venue = getValue(event, "event.venue");
        if (
          data.collections.activities.some(
            (item) =>
              item.id !== next.id &&
              item.memberId === next.memberId &&
              item.eventId === next.eventId,
          )
        )
          throw new Error(
            "Hội viên đã có bản ghi tham gia sự kiện này. Hãy sửa bản ghi hiện có.",
          );
      }
      await saveRecord(config.collection, next, Boolean(record), data);
      onSaved();
      onClose();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Không thể lưu dữ liệu.";
      setError(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="record-dialog"
      onCancel={onClose}
      aria-labelledby="record-title"
    >
      <form onSubmit={submit}>
        <div className="dialog-header">
          <div>
            <span className="eyebrow">QUẢN TRỊ HỘI</span>
            <h2 id="record-title">
              {record ? "Chỉnh sửa" : "Thêm"} {config.singular}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Đóng biểu mẫu"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-body">
          <fieldset className="form-grid record-fields" disabled={saving}>
            {config.fields.map((field) => {
              const existing = record ? getValue(record, field.key) : undefined;
              const value =
                existing ??
                (field.type === "date" &&
                !["birthDate", "joinedAt", "event.date", "visit.date"].includes(
                  field.key,
                )
                  ? today
                  : field.key === "year"
                    ? new Date().getFullYear()
                    : field.key === "position"
                      ? config.boardOnly
                        ? "Ủy viên Ban chấp hành"
                        : "Hội viên"
                      : field.type === "select"
                        ? (field.options?.[0]?.[0] ?? "")
                        : "");
              const options = field.source
                ? data.collections[field.source].map((item) => [
                    item.id,
                    String(item.name ?? item.title),
                  ])
                : field.options;
              const textValue =
                field.type === "paragraphs" && Array.isArray(value)
                  ? value.join("\n")
                  : field.type === "agenda" && Array.isArray(value)
                    ? value
                        .map((item) =>
                          typeof item === "object" &&
                          item !== null &&
                          !Array.isArray(item)
                            ? `${item.time} | ${item.title}`
                            : "",
                        )
                        .join("\n")
                    : String(value ?? "");
              if (field.type === "topic")
                return (
                  <TopicPicker
                    key={field.key}
                    name={field.key}
                    value={textValue}
                    required={field.required}
                    suggestions={[
                      ...data.collections.news,
                      ...data.collections.events,
                      ...data.collections["member-visits"],
                    ].map((item) => String(item.topic ?? ""))}
                  />
                );
              if (field.type === "image")
                return (
                  <div key={field.key} className="form-field full-width">
                    <span>
                      {field.label}
                      {field.required && <em> *</em>}
                    </span>
                    <ImagePicker
                      name={field.key}
                      value={textValue}
                      required={field.required}
                    />
                  </div>
                );
              return (
                <label
                  key={field.key}
                  className={`form-field ${["textarea", "paragraphs", "agenda"].includes(field.type || "") ? "full-width" : ""} ${field.type === "checkbox" ? "checkbox-field" : ""}`}
                >
                  <span>
                    {field.label}
                    {field.required && <em> *</em>}
                  </span>
                  {field.type === "checkbox" ? (
                    <input
                      name={field.key}
                      type="checkbox"
                      defaultChecked={
                        config.boardOnly && field.key === "isBoard"
                          ? true
                          : Boolean(value)
                      }
                      disabled={config.boardOnly && field.key === "isBoard"}
                    />
                  ) : field.type === "select" ? (
                    <select
                      name={field.key}
                      defaultValue={textValue}
                      required={field.required}
                    >
                      {field.source && (
                        <option value="">
                          Chọn{" "}
                          {field.source === "members" ? "hội viên" : "sự kiện"}
                        </option>
                      )}
                      {options?.map(([id, label]) => (
                        <option value={id} key={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : ["textarea", "paragraphs", "agenda"].includes(
                      field.type || "",
                    ) ? (
                    <textarea
                      name={field.key}
                      defaultValue={textValue}
                      required={field.required}
                      rows={field.type === "paragraphs" ? 6 : 3}
                    />
                  ) : (
                    <input
                      name={field.key}
                      type={field.type || "text"}
                      defaultValue={textValue}
                      required={field.required}
                      min={field.min}
                      step={field.type === "number" ? 1 : undefined}
                    />
                  )}
                </label>
              );
            })}
          </fieldset>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer">
          <span>
            {isBackendCollection(config.collection)
              ? "Lưu trên MongoDB của Hội."
              : "Chỉ lưu trong trình duyệt này."}
          </span>
          <button
            type="button"
            className="button button-secondary"
            disabled={saving}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={saving}
          >
            <Check size={16} />
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
