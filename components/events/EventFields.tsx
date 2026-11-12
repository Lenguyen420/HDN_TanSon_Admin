"use client";

import { useId, useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { parseTimeRange } from "@/services/event-form";
import type { RecordValue } from "@/services/association-store";
import EventFilePicker from "./EventFilePicker";

type Props = {
  name: string;
  label: string;
  value: RecordValue;
  required?: boolean;
};
function rows(value: RecordValue) {
  return Array.isArray(value)
    ? (value.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      ) as { [key: string]: RecordValue }[])
    : [];
}

export function TimeRangeField({ name, label, value, required }: Props) {
  const id = useId();
  const [range, setRange] = useState(() => parseTimeRange(String(value ?? "")));
  return (
    <div
      className="form-field full-width event-editor-section"
      role="group"
      aria-labelledby={id}
    >
      <span id={id}>
        <Clock size={17} aria-hidden="true" /> {label}
        {required && <em> *</em>}
      </span>
      <div className="event-time-range">
        <label className="form-field">
          <span>Giờ bắt đầu</span>
          <input
            type="time"
            name={`${name}:start`}
            value={range.start}
            onChange={(e) => setRange({ ...range, start: e.target.value })}
            required={required}
            step={60}
          />
        </label>
        <label className="form-field">
          <span>Giờ kết thúc</span>
          <input
            type="time"
            name={`${name}:end`}
            value={range.end}
            onChange={(e) => setRange({ ...range, end: e.target.value })}
            required={required}
            step={60}
          />
        </label>
      </div>
      <p className="event-field-hint">
        Chọn giờ trong ngày tổ chức, theo giờ Việt Nam. Giờ kết thúc phải sau
        giờ bắt đầu.
      </p>
      {value && !parseTimeRange(String(value)).start ? (
        <p className="event-field-hint">
          Khung giờ cũ: {String(value)}. Vui lòng chọn lại giờ bắt đầu và kết
          thúc.
        </p>
      ) : null}
    </div>
  );
}

export function AgendaField({ name, label, value }: Props) {
  const id = useId();
  const [items, setItems] = useState(() =>
    rows(value).map((item) => ({
      key: crypto.randomUUID(),
      time: String(item.time ?? ""),
      title: String(item.title ?? ""),
    })),
  );
  return (
    <div
      className="form-field full-width event-editor-section"
      role="group"
      aria-labelledby={id}
    >
      <span id={id}>{label}</span>
      {items.map((item, index) => (
        <div className="event-agenda-row" key={item.key}>
          <label className="form-field">
            <span>Giờ mục {index + 1}</span>
            <input
              name={`${name}:time`}
              type="time"
              step={60}
              defaultValue={item.time}
              required
            />
          </label>
          <label className="form-field">
            <span>Nội dung mục {index + 1}</span>
            <input
              name={`${name}:title`}
              defaultValue={item.title}
              maxLength={500}
              required
              placeholder="Ví dụ: Đón tiếp hội viên"
            />
          </label>
          <button
            type="button"
            className="icon-button danger-button"
            aria-label={`Xóa mục lịch trình ${index + 1}`}
            onClick={() =>
              setItems((current) =>
                current.filter((row) => row.key !== item.key),
              )
            }
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary event-add-row"
        disabled={items.length >= 100}
        onClick={() =>
          setItems((current) => [
            ...current,
            { key: crypto.randomUUID(), time: "", title: "" },
          ])
        }
      >
        <Plus size={17} /> Thêm mục lịch trình
      </button>
      <p className="event-field-hint">
        Lịch trình được xếp theo giờ khi lưu và hiển thị trong chi tiết sự kiện
        trên Mini App.
      </p>
    </div>
  );
}

export function EventFilesField({ name, label, value }: Props) {
  const id = useId();
  const [items, setItems] = useState(() =>
    rows(value).map((item) => ({
      key: crypto.randomUUID(),
      id: String(item.id || crypto.randomUUID()),
      title: String(item.title ?? ""),
      url: String(item.url ?? ""),
      date: String(item.publishedAt ?? ""),
    })),
  );
  return (
    <div
      className="form-field full-width event-editor-section"
      role="group"
      aria-labelledby={id}
    >
      <span id={id}>{label}</span>
      {items.map((item, index) => (
        <div className="event-file-row" key={item.key}>
          <input type="hidden" name={`${name}:id`} value={item.id} />
          <label className="form-field">
            <span>
              Tên {label.toLocaleLowerCase("vi")} {index + 1}
            </span>
            <input
              name={`${name}:title`}
              defaultValue={item.title}
              maxLength={300}
            />
          </label>
          <EventFilePicker
            name={name}
            label={`${label} ${index + 1}`}
            value={item.url}
          />
          <label className="form-field">
            <span>Ngày công bố {index + 1}</span>
            <input name={`${name}:date`} type="date" defaultValue={item.date} />
          </label>
          <button
            type="button"
            className="icon-button danger-button"
            aria-label={`Xóa ${label.toLocaleLowerCase("vi")} ${index + 1}`}
            onClick={() =>
              setItems((current) =>
                current.filter((row) => row.key !== item.key),
              )
            }
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary event-add-row"
        disabled={items.length >= 100}
        onClick={() =>
          setItems((current) => [
            ...current,
            {
              key: crypto.randomUUID(),
              id: crypto.randomUUID(),
              title: "",
              url: "",
              date: "",
            },
          ])
        }
      >
        <Plus size={17} /> Thêm {label.toLocaleLowerCase("vi")}
      </button>
      <p className="event-field-hint">
        Không bắt buộc. Có thể lưu sự kiện và bổ sung sau. Chọn PDF, Word,
        Excel, PowerPoint hoặc ảnh từ máy tính, tối đa 4 MB/file.
      </p>
    </div>
  );
}
