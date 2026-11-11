import type { Metadata } from "next";

import GenericAdminPage, {
  type GenericAdminConfig,
} from "@/components/admin/GenericAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Documents",
  description: "Quản lý tài liệu",
};

const config: GenericAdminConfig = {
  title: "Quản lý tài liệu",
  eyebrow: "Documents",
  description: "Quản lý tài liệu nội bộ, phiên bản, tải xuống và xem trước.",
  resource: "documents",
  columns: [
    { key: "id", label: "ID" },
    { key: "title", label: "Tiêu đề" },
    { key: "status", label: "Trạng thái" },
    { key: "categoryName", label: "Danh mục" },
    { key: "createdAt", label: "Ngày tạo" },
    { key: "updatedAt", label: "Cập nhật" },
  ],
  fields: [
    { name: "title", label: "Tiêu đề", required: true },
    { name: "categoryId", label: "ID danh mục" },
    { name: "status", label: "Trạng thái" },
    { name: "summary", label: "Tóm tắt", type: "textarea" },
    { name: "attachmentId", label: "ID tệp đính kèm" },
    { name: "metadata", label: "metadata JSON", type: "json" },
  ],
  actions: [
    { label: "Tải xuống", kind: "download", path: "/documents/:id/download" },
    { label: "Xem trước", kind: "open", path: "/documents/:id/preview" },
  ],
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/documents">
      <GenericAdminPage config={config} />
    </AppShell>
  );
}
