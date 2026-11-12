"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  EVENT_FILE_ACCEPT,
  validateEventFile,
} from "@/services/api/eventFilesApi";
import { eventFileHref, isEventFileUrl } from "@/services/event-form";

export default function EventFilePicker({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const autoTitle = useRef("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const titleInput = () =>
    input.current
      ?.closest(".event-file-row")
      ?.querySelector<HTMLInputElement>(`input[name="${name}:title"]`);
  function clear() {
    if (input.current) {
      input.current.value = "";
      input.current.setCustomValidity("");
    }
    const title = titleInput();
    if (title && autoTitle.current && title.value === autoTitle.current)
      title.value = "";
    autoTitle.current = "";
    setFileName("");
    setError("");
  }
  return (
    <div className="form-field event-file-picker">
      <span>File {label.toLocaleLowerCase("vi")}</span>
      <input type="hidden" name={`${name}:url`} value={value} />
      <input
        ref={input}
        className="image-picker-input"
        type="file"
        accept={EVENT_FILE_ACCEPT}
        name={`${name}:file`}
        aria-label={`Chọn file ${label.toLocaleLowerCase("vi")} từ máy tính`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            validateEventFile(file);
            event.target.setCustomValidity("");
            setError("");
            setFileName(file.name);
            const title = titleInput();
            if (title && !title.value.trim()) {
              autoTitle.current = file.name
                .replace(/\.[^.]+$/, "")
                .slice(0, 300);
              title.value = autoTitle.current;
            }
          } catch (cause) {
            const message =
              cause instanceof Error ? cause.message : "File không hợp lệ.";
            event.target.value = "";
            event.target.setCustomValidity(message);
            setFileName("");
            setError(message);
          }
        }}
      />
      <button
        type="button"
        className="button button-secondary"
        onClick={() => input.current?.click()}
      >
        <Upload size={16} />{" "}
        {value || fileName ? "Chọn file khác" : "Chọn file từ máy tính"}
      </button>
      {fileName && (
        <small className="event-field-hint">
          Đã chọn: {fileName}. File sẽ tải lên khi lưu sự kiện.
        </small>
      )}
      {!fileName && isEventFileUrl(value) && (
        <a
          href={eventFileHref(value)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Mở file hiện tại
        </a>
      )}
      {(fileName || error) && (
        <button
          type="button"
          className="button button-secondary"
          onClick={clear}
        >
          <X size={16} /> Bỏ file vừa chọn
        </button>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
