import type { FeeCampaign, FeeList } from "./api/membershipFeeApi";

export interface DashboardFeeTotals {
  paidAmount: number;
  remainingAmount: number;
  paidCount: number;
}

// Each campaign summary covers all its dues, including confirmed receipts in closed campaigns.
export async function loadDashboardFeeTotals(
  fetchPage: (page: number) => Promise<FeeList<FeeCampaign>>,
): Promise<DashboardFeeTotals> {
  const totals = { paidAmount: 0, remainingAmount: 0, paidCount: 0 };
  let loaded = 0;
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    if (!result.data.length && loaded < result.pagination.total)
      throw new Error("Chưa tải đủ các đợt hội phí.");
    for (const campaign of result.data) {
      const summary = campaign.summary;
      if (
        !summary ||
        ![summary.paidAmount, summary.remainingAmount, summary.paid].every(
          Number.isFinite,
        )
      )
        throw new Error("Chưa tải được thống kê hội phí.");
      totals.paidAmount += summary.paidAmount;
      totals.remainingAmount += summary.remainingAmount;
      totals.paidCount += summary.paid;
    }
    loaded += result.data.length;
    if (loaded >= result.pagination.total) return totals;
  }
}
