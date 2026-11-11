"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getKpiErrorMessage,
  kpiReportApi,
  type EmployeeKpiReport,
  type KpiReportResponse,
  type TaskAssignmentOptions,
} from "@/services/kpi-report";

export type QueryState<T> = {
  data: T | null;
  error: string | null;
  /** Lần tải đầu tiên (chưa có gì trong cache để hiển thị). */
  isLoading: boolean;
  /** Đang gọi lại API dù đã có dữ liệu hiển thị. */
  isFetching: boolean;
  fetchedAt: number | null;
  refetch: () => void;
};

type CacheEntry<T> = { data: T; fetchedAt: number };

/** Kết quả của lần gọi API gần nhất, gắn với đúng `key` + `token` đã phát sinh nó. */
type SettledResult<T> = {
  key: string;
  token: number;
  data: T | null;
  error: string | null;
  fetchedAt: number | null;
};

const reportCache = new Map<string, CacheEntry<KpiReportResponse>>();
const employeeCache = new Map<string, CacheEntry<EmployeeKpiReport>>();
let optionsCache: CacheEntry<TaskAssignmentOptions> | null = null;

function buildKey(parts: Array<string | number | undefined>): string {
  return parts.map((part) => (part === undefined ? "" : String(part))).join("|");
}

/**
 * Hook dùng chung cho các truy vấn báo cáo. Dữ liệu cache theo `key` được đọc
 * ngay trong lúc render nên đổi bộ lọc qua lại không nháy màn hình, còn state
 * chỉ được cập nhật từ callback bất đồng bộ của lần gọi API tương ứng.
 */
function useCachedQuery<T>(
  key: string | null,
  cache: Map<string, CacheEntry<T>>,
  fetcher: () => Promise<T>,
): QueryState<T> {
  const [reloadToken, setReloadToken] = useState(0);
  const [settled, setSettled] = useState<SettledResult<T> | null>(null);

  useEffect(() => {
    if (!key) {
      return;
    }

    let active = true;

    fetcher()
      .then((result) => {
        cache.set(key, { data: result, fetchedAt: Date.now() });

        if (active) {
          setSettled({
            key,
            token: reloadToken,
            data: result,
            error: null,
            fetchedAt: Date.now(),
          });
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setSettled({
            key,
            token: reloadToken,
            data: null,
            error: getKpiErrorMessage(cause),
            fetchedAt: null,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [cache, fetcher, key, reloadToken]);

  const refetch = useCallback(() => {
    if (key) {
      cache.delete(key);
    }

    setReloadToken((token) => token + 1);
  }, [cache, key]);

  if (!key) {
    return {
      data: null,
      error: null,
      isLoading: false,
      isFetching: false,
      fetchedAt: null,
      refetch,
    };
  }

  const cached = cache.get(key) ?? null;
  const isSettled = settled?.key === key && settled.token === reloadToken;
  const data = (isSettled ? settled.data : null) ?? cached?.data ?? null;

  return {
    data,
    error: isSettled ? settled.error : null,
    isLoading: data === null && !isSettled,
    isFetching: !isSettled,
    fetchedAt: (isSettled ? settled.fetchedAt : null) ?? cached?.fetchedAt ?? null,
    refetch,
  };
}

export function useKpiReport(filters: {
  month: number;
  year: number;
  assigneeId: string;
}): QueryState<KpiReportResponse> {
  const { month, year, assigneeId } = filters;
  const fetcher = useCallback(
    () =>
      kpiReportApi.getReport({ month, year, assigneeId: assigneeId || undefined }),
    [month, year, assigneeId],
  );

  return useCachedQuery(buildKey([month, year, assigneeId]), reportCache, fetcher);
}

export function useEmployeeKpiReport(
  assigneeId: string,
  filters: { month: number; year: number },
): QueryState<EmployeeKpiReport> {
  const { month, year } = filters;
  const fetcher = useCallback(
    () => kpiReportApi.getEmployeeReport(assigneeId, { month, year }),
    [assigneeId, month, year],
  );

  return useCachedQuery(
    assigneeId ? buildKey([assigneeId, month, year]) : null,
    employeeCache,
    fetcher,
  );
}

export function useAssignmentOptions(): TaskAssignmentOptions | null {
  const [loaded, setLoaded] = useState<TaskAssignmentOptions | null>(null);

  useEffect(() => {
    if (optionsCache) {
      return;
    }

    let active = true;

    kpiReportApi
      .getAssignmentOptions()
      .then((result) => {
        optionsCache = { data: result, fetchedAt: Date.now() };

        if (active) {
          setLoaded(result);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return loaded ?? optionsCache?.data ?? null;
}

/** Xoá cache sau khi chấm điểm để lần tải kế tiếp lấy số liệu mới từ backend. */
export function invalidateKpiCaches() {
  reportCache.clear();
  employeeCache.clear();
}
