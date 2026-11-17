import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboardFeeTotals } from "../services/dashboard-finance.ts";
import type { FeeCampaign } from "../services/api/membershipFeeApi";

const campaign = (
  paid: number,
  paidAmount: number,
  remainingAmount: number,
  status: FeeCampaign["status"] = "published",
) =>
  ({
    id: String(paidAmount),
    status,
    summary: { paid, paidAmount, remainingAmount },
  }) as FeeCampaign;

test("overview totals use confirmed dues across every campaign page, including closed campaigns", async () => {
  const requested: number[] = [];
  const pages = [
    [campaign(1, 1_000_000, 3_000_000), campaign(0, 0, 0, "draft")],
    [campaign(2, 4_000_000, 0, "closed")],
  ];
  const totals = await loadDashboardFeeTotals(async (page) => {
    requested.push(page);
    return { data: pages[page - 1], pagination: { page, limit: 2, total: 3 } };
  });
  assert.deepEqual(requested, [1, 2]);
  assert.deepEqual(totals, {
    paidAmount: 5_000_000,
    remainingAmount: 3_000_000,
    paidCount: 3,
  });
});

test("zero fees is returned only for a successfully loaded empty list", async () => {
  assert.deepEqual(
    await loadDashboardFeeTotals(async () => ({
      data: [],
      pagination: { page: 1, limit: 100, total: 0 },
    })),
    {
      paidAmount: 0,
      remainingAmount: 0,
      paidCount: 0,
    },
  );
});

test("missing statistics and incomplete pages fail instead of showing zero or partial totals", async () => {
  await assert.rejects(
    loadDashboardFeeTotals(async () => ({
      data: [{ id: "missing" } as FeeCampaign],
      pagination: { page: 1, limit: 100, total: 1 },
    })),
    /thống kê/,
  );
  await assert.rejects(
    loadDashboardFeeTotals(async (page) => ({
      data: page === 1 ? [campaign(1, 1_000_000, 0)] : [],
      pagination: { page, limit: 1, total: 2 },
    })),
    /Chưa tải đủ/,
  );
  await assert.rejects(
    loadDashboardFeeTotals(async () => {
      throw new Error("API unavailable");
    }),
    /API unavailable/,
  );
});
