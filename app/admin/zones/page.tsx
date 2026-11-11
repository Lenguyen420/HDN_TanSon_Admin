import type { Metadata } from "next";

import GenericAdminPage, {
  type GenericAdminConfig,
} from "@/components/admin/GenericAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Zones",
  description: "Quản lý khu vực",
};

const config: GenericAdminConfig = {
  title: "Quản lý khu vực",
  eyebrow: "Zones",
  description: "Quản lý cây khu vực, khu vực cha và mô tả địa bàn.",
  resource: "zones",
  columns: [
    { key: "id", label: "ID" },
    { key: "name", label: "Tên khu vực" },
    { key: "parentId", label: "Khu vực cha" },
    { key: "order", label: "Thứ tự" },
    { key: "status", label: "Trạng thái" },
  ],
  fields: [
    { name: "name", label: "Tên khu vực", required: true },
    { name: "parentId", label: "ID khu vực cha" },
    { name: "order", label: "Thứ tự", type: "number" },
    { name: "status", label: "Trạng thái" },
    { name: "description", label: "Mô tả", type: "textarea" },
  ],
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/zones">
      <GenericAdminPage config={config} />
    </AppShell>
  );
}
