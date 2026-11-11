import type { Metadata } from "next";

import GenericAdminPage, {
  type GenericAdminConfig,
} from "@/components/admin/GenericAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Attachments",
  description: "Quản lý tệp đính kèm",
};

const config: GenericAdminConfig = {
  title: "Quản lý tệp đính kèm",
  eyebrow: "Attachments",
  description: "Tải lên, xem thông tin và tải xuống tệp đính kèm qua endpoint bảo mật.",
  resource: "attachments",
  allowCreate: false,
  allowEdit: false,
  allowUpload: true,
  columns: [
    { key: "id", label: "ID" },
    { key: "fileName", label: "Tên tệp" },
    { key: "mimeType", label: "Loại" },
    { key: "size", label: "Dung lượng" },
    { key: "createdAt", label: "Ngày tạo" },
  ],
  actions: [
    { label: "Tải xuống", kind: "download", path: "/attachments/:id/download" },
  ],
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/attachments">
      <GenericAdminPage config={config} />
    </AppShell>
  );
}
