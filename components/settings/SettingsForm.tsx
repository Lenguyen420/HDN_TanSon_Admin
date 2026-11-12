"use client";

import Image from "next/image";
import { notify } from "@/lib/notify";
import { useState, type FormEvent } from "react";
import { Download, Save } from "lucide-react";
import type { AssociationRecord } from "@/services/association-store";
import { saveAssociationSettings } from "@/services/association-api";
import {
  loadAssociationData,
  remoteCollections,
  type DataKey,
} from "@/services/association-data";
import { useAssociationData } from "@/components/shared/association/useAssociationData";

const groups = [
  {
    title: "Giới thiệu Hội",
    description: "Thông tin giới thiệu và định hướng hoạt động của Hội.",
    fields: [
      ["name", "Tên Hội"],
      ["slogan", "Khẩu hiệu"],
      ["introduction", "Giới thiệu", "textarea"],
      ["mission", "Sứ mệnh", "textarea"],
    ],
  },
  {
    title: "Liên hệ & hỗ trợ",
    description: "Thông tin Ban thư ký để hội viên dễ dàng kết nối.",
    fields: [
      ["department", "Bộ phận liên hệ"],
      ["address", "Địa chỉ"],
      ["hours", "Giờ làm việc"],
      ["phone", "Điện thoại", "tel"],
      ["email", "Email", "email"],
      ["zaloUrl", "Liên kết Zalo Official Account", "url"],
    ],
  },
  {
    title: "Trợ lý sự kiện",
    description: "Nội dung chào và câu trả lời tham khảo trong Mini App.",
    fields: [
      ["assistantGreeting", "Lời chào", "textarea"],
      [
        "assistantQuestions",
        "Câu hỏi và trả lời (mỗi dòng: câu hỏi | câu trả lời)",
        "textarea",
      ],
    ],
  },
];

export default function SettingsForm() {
  const { data, error } = useAssociationData({ settings: true });
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const settings: AssociationRecord = { id: "association" };
      for (const { fields } of groups)
        for (const [key] of fields)
          settings[key] = String(form.get(key) ?? "").trim();
      if (!settings.name || !settings.slogan)
        throw new Error("Vui lòng nhập tên Hội và khẩu hiệu.");
      if (settings.zaloUrl && !String(settings.zaloUrl).startsWith("https://"))
        throw new Error("Liên kết Zalo cần bắt đầu bằng https://.");
      if (
        String(settings.assistantQuestions)
          .split("\n")
          .some(
            (line) =>
              line.trim() &&
              (!line.includes("|") ||
                !line.split("|")[0].trim() ||
                !line.slice(line.indexOf("|") + 1).trim()),
          )
      )
        throw new Error("Mỗi câu hỏi cần có dạng: câu hỏi | câu trả lời.");
      await saveAssociationSettings(settings);
      notify.success("Đã lưu thông tin Hội.");
      setFailure("");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Không thể lưu thông tin.";
      setFailure(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  }
  async function backup() {
    if (backingUp) return;
    setBackingUp(true);
    try {
      const snapshot = await loadAssociationData([
        ...remoteCollections,
        "settings",
      ] as DataKey[]);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `tan-son-admin-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify.success("Đã tạo bản sao dữ liệu.");
    } catch (cause) {
      notify.error(
        cause instanceof Error
          ? cause.message
          : "Không tạo được bản sao dữ liệu.",
      );
    } finally {
      setBackingUp(false);
    }
  }
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CẤU HÌNH MINI APP</span>
          <h1>Thông tin Hội</h1>
          <p>Giữ thông tin nhất quán trong mọi kết nối với hội viên.</p>
        </div>
        <button
          className="button button-secondary"
          onClick={backup}
          disabled={!data || Boolean(error) || saving || backingUp}
        >
          <Download size={17} />
          {backingUp ? "Đang tạo bản sao…" : "Xuất bản sao dữ liệu"}
        </button>
      </div>
      {(error || failure) && (
        <p className="error-message" role="alert">
          {error || failure}
        </p>
      )}
      {!data ? (
        <div className="panel empty-state">
          {error ? "Không thể đọc dữ liệu." : "Đang tải thông tin…"}
        </div>
      ) : (
        <form
          key={String(data.settings.updatedAt ?? "initial")}
          onSubmit={save}
          className="settings-layout"
        >
          <div className="settings-form">
            {groups.map((group) => (
              <section className="panel settings-section" key={group.title}>
                <div className="panel-heading">
                  <div>
                    <h2>{group.title}</h2>
                    <p>{group.description}</p>
                  </div>
                </div>
                <div className="form-grid">
                  {group.fields.map(([key, label, type]) => (
                    <label
                      className={`form-field ${type === "textarea" ? "full-width" : ""}`}
                      key={key}
                    >
                      <span>
                        {label}
                        {["name", "slogan"].includes(key) && <em> *</em>}
                      </span>
                      {type === "textarea" ? (
                        <textarea
                          name={key}
                          disabled={saving}
                          rows={key === "assistantQuestions" ? 6 : 4}
                          defaultValue={String(data.settings[key] || "")}
                        />
                      ) : (
                        <input
                          name={key}
                          type={type || "text"}
                          disabled={saving}
                          defaultValue={String(data.settings[key] || "")}
                          required={["name", "slogan"].includes(key)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </section>
            ))}
            <div className="settings-save">
              <p>
                Thông tin được lưu trên hệ thống và dùng chung cho các thiết bị.
              </p>
              <button
                className="button button-primary"
                type="submit"
                disabled={saving}
              >
                <Save size={17} />
                {saving ? "Đang lưu…" : "Lưu thông tin Hội"}
              </button>
            </div>
          </div>
          <aside className="panel settings-preview">
            <Image
              src="/association/logo.jpg"
              alt="Logo Hội Doanh nghiệp Phường Tân Sơn"
              width={100}
              height={100}
            />
            <span className="eyebrow">NHẬN DIỆN THƯƠNG HIỆU</span>
            <h2>{String(data.settings.name)}</h2>
            <p>{String(data.settings.slogan)}</p>
            <hr />
            <strong>Phạm vi dữ liệu</strong>
            <p>
              Thông tin Hội, hội viên, hồ sơ đăng ký và nội dung được lưu trên
              hệ thống. Hội phí, tài trợ và lịch sử tham gia còn lưu trên trình
              duyệt.
            </p>
            <p>
              Bản sao gồm thông tin Hội, dữ liệu đã tải từ hệ thống và dữ liệu
              cục bộ trên thiết bị này.
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}
