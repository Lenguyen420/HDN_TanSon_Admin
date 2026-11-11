import type { Metadata } from "next";
import { Suspense } from "react";

import AppShell from "@/components/layout/AppShell";
import KpiReportPage from "@/components/kpi-report/KpiReportPage";
import { KpiSkeleton } from "@/components/kpi-report/StateBlocks";

export const metadata: Metadata = {
  title: "Báo cáo điểm",
  description: "Báo cáo điểm KPI theo tháng, nhóm công việc theo nhân viên",
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/point-report">
      <Suspense fallback={<KpiSkeleton />}>
        <KpiReportPage />
      </Suspense>
    </AppShell>
  );
}
