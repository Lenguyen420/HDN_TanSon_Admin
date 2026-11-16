"use client";
import { useEffect, useState } from "react";
import { partnerApi, type PartnerReference } from "@/services/api/partnerApi";
export default function PartnerReferencePicker({
  name,
  resource,
  value,
  label,
}: {
  name: string;
  resource: "members" | "events";
  value: string;
  label: string;
}) {
  const [selected, setSelected] = useState(value),
    [search, setSearch] = useState(""),
    [items, setItems] = useState<PartnerReference[]>([]),
    [existing, setExisting] = useState<PartnerReference>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!value) return;
    const c = new AbortController();
    void partnerApi
      .reference(resource, value, c.signal)
      .then(setExisting)
      .catch(() => {
        if (!c.signal.aborted) setError("Chưa tải được thông tin đã liên kết.");
      });
    return () => c.abort();
  }, [resource, value]);
  useEffect(() => {
    const c = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void partnerApi
        .references(resource, search, c.signal)
        .then((rows) => {
          if (!c.signal.aborted) {
            setItems(rows);
            setError("");
          }
        })
        .catch(() => {
          if (!c.signal.aborted)
            setError("Chưa tải được danh sách. Vui lòng tìm lại.");
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [resource, search]);
  const rows =
    existing && !items.some((item) => item.id === existing.id)
      ? [existing, ...items]
      : items;
  return (
    <div className="form-field">
      <label htmlFor={name + "-search"}>{label}</label>
      <input
        id={name + "-search"}
        type="search"
        placeholder={
          resource === "members"
            ? "Tìm tên hội viên hoặc doanh nghiệp…"
            : "Tìm tên chương trình, sự kiện…"
        }
        maxLength={150}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        name={name}
        aria-label={label}
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setExisting(rows.find((item) => item.id === e.target.value));
        }}
      >
        <option value="">Không liên kết</option>
        {selected && !rows.some((item) => item.id === selected) && (
          <option value={selected}>Đã liên kết (chưa tải tên)</option>
        )}
        {rows.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title || item.name}
            {item.company ? ` · ${item.company}` : ""}
          </option>
        ))}
      </select>
      {loading && <small role="status">Đang tìm…</small>}
      {error && <small role="status">{error}</small>}
    </div>
  );
}
