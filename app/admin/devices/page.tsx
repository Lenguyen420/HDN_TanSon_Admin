import type { Metadata } from "next";

import GenericAdminPage, {
  type GenericAdminConfig,
} from "@/components/admin/GenericAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Devices",
  description: "Quản lý thiết bị",
};

const config: GenericAdminConfig = {
  title: "Quản lý thiết bị",
  eyebrow: "Devices",
  description: "Quản lý thiết bị, trạng thái và thông tin bàn giao.",
  resource: "devices",
  columns: [
    { key: "id", label: "ID" },
    { key: "name", label: "Tên thiết bị" },
    { key: "code", label: "Mã" },
    { key: "status", label: "Trạng thái" },
    { key: "type", label: "Loại" },
    { key: "location", label: "Vị trí" },
  ],
  fields: [
    { name: "name", label: "Tên thiết bị", required: true },
    { name: "code", label: "Mã thiết bị" },
    { name: "type", label: "Loại thiết bị" },
    { name: "status", label: "Trạng thái" },
    { name: "location", label: "Vị trí" },
    { name: "description", label: "Mô tả", type: "textarea" },
  ],
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/devices">
      <GenericAdminPage config={config} />
    </AppShell>
  );
}
