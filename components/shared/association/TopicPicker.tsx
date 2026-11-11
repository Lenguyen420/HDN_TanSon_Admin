"use client";

import { useId, useState } from "react";

const standardTopics = [
  "Hoạt động Hội",
  "Tin doanh nghiệp",
  "Chính sách & pháp luật",
  "Cộng đồng & thiện nguyện",
];
const clean = (text: string) => text.trim().replace(/\s+/g, " ");
const identity = (text: string) => clean(text).toLocaleLowerCase("vi");

export default function TopicPicker({
  name,
  value,
  suggestions,
  required = false,
}: {
  name: string;
  value: string;
  suggestions: string[];
  required?: boolean;
}) {
  const id = useId();
  const options = [...standardTopics];
  const seen = new Set(options.map(identity));
  for (const topic of [value, ...suggestions]) {
    const label = clean(topic);
    if (label && !seen.has(identity(label))) {
      options.push(label);
      seen.add(identity(label));
    }
  }
  const existing = options.find((topic) => identity(topic) === identity(value));
  const [selection, setSelection] = useState(
    existing ? "topic:" + existing : "",
  );
  const [custom, setCustom] = useState("");
  const isCustom = selection === "custom";
  const selectedTopic = isCustom
    ? (options.find((topic) => identity(topic) === identity(custom)) ??
      clean(custom))
    : selection.slice("topic:".length);

  return (
    <div className="form-field">
      <span>
        <label htmlFor={id}>Chuyên mục{required && <em> *</em>}</label>
      </span>
      <select
        id={id}
        value={selection}
        required={required}
        onChange={(event) => setSelection(event.target.value)}
        aria-describedby={id + "-hint"}
      >
        <option value="">Chọn chuyên mục</option>
        {options.map((topic) => (
          <option key={topic} value={"topic:" + topic}>
            {topic}
          </option>
        ))}
        <option value="custom">Khác — nhập chuyên mục mới</option>
      </select>
      {isCustom && (
        <>
          <label htmlFor={id + "-custom"}>Tên chuyên mục mới</label>
          <input
            id={id + "-custom"}
            type="text"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            required={required}
            maxLength={150}
            placeholder="Nhập tên chuyên mục"
          />
        </>
      )}
      <input type="hidden" name={name} value={selectedTopic} />
      <small id={id + "-hint"}>
        Chọn chuyên mục có sẵn hoặc chọn “Khác” để nhập tên mới.
      </small>
    </div>
  );
}
