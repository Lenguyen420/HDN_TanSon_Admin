import type { Metadata } from "next";
import { Suspense } from "react";

import AppShell from "@/components/layout/AppShell";
import EmployeeReportDetail from "@/components/kpi-report/EmployeeReportDetail";
import { KpiSkeleton } from "@/components/kpi-report/StateBlocks";

export const metadata: Metadata = {
  title: "Chi tiết báo cáo điểm",
  description: "Báo cáo điểm KPI chi tiết của một nhân viên",
};

export default async function Page({
  params,
}: {
  params: Promise<{ assigneeId: string }>;
}) {
  const { assigneeId } = await params;

  return (
    <AppShell activeHref="/admin/point-report">
      <Suspense fallback={<KpiSkeleton groups={3} />}>
        <EmployeeReportDetail assigneeId={assigneeId} />
      </Suspense>
    </AppShell>
  );
}
