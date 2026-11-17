"use client";

import { useEffect, useState } from "react";
import { membershipFeeApi } from "@/services/api/membershipFeeApi";
import { partnerApi, type Summary } from "@/services/api/partnerApi";
import {
  loadDashboardFeeTotals,
  type DashboardFeeTotals,
} from "@/services/dashboard-finance";

type Result<T> = { data: T | null; error: string };

export function useDashboardFinance() {
  const [fees, setFees] = useState<Result<DashboardFeeTotals>>({
    data: null,
    error: "",
  });
  const [sponsorships, setSponsorships] = useState<Result<Summary>>({
    data: null,
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function load() {
      if (running || controller.signal.aborted) return;
      running = true;
      setFees({ data: null, error: "" });
      setSponsorships({ data: null, error: "" });
      await Promise.allSettled([
        loadDashboardFeeTotals((page) =>
          membershipFeeApi.list({ page, limit: 100 }, controller.signal),
        )
          .then((data) => {
            if (!controller.signal.aborted) setFees({ data, error: "" });
          })
          .catch(() => {
            if (!controller.signal.aborted)
              setFees({
                data: null,
                error: "Không tải được số liệu hội phí. Vui lòng thử lại.",
              });
          }),
        partnerApi
          .statistics({}, controller.signal)
          .then((data) => {
            if (!controller.signal.aborted)
              setSponsorships({ data, error: "" });
          })
          .catch(() => {
            if (!controller.signal.aborted)
              setSponsorships({
                data: null,
                error: "Không tải được số liệu tài trợ. Vui lòng thử lại.",
              });
          }),
      ]);
      running = false;
    }
    const refresh = () => {
      void load();
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      controller.abort();
    };
  }, []);
  return { fees, sponsorships };
}
