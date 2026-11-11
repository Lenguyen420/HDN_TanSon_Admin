import type { Metadata } from "next";

import GenericAdminPage, {
  type GenericAdminConfig,
} from "@/components/admin/GenericAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Reports",
  description: "Báo cáo cuộc họp",
};

const config: GenericAdminConfig = {
  title: "Báo cáo cuộc họp",
  eyebrow: "Reports",
  description: "Xem dữ liệu báo cáo từ endpoint /meeting-reports.",
  resource: "meeting-reports",
  allowCreate: false,
  allowEdit: false,
  allowDelete: false,
  columns: [
    { key: "id", label: "ID" },
    { key: "title", label: "Tiêu đề" },
    { key: "status", label: "Trạng thái" },
    { key: "total", label: "Tổng" },
    { key: "createdAt", label: "Ngày tạo" },
  ],
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/reports">
      <GenericAdminPage config={config} />
    </AppShell>
  );
}
