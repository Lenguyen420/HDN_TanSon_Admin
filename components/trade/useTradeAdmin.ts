"use client";
import { useEffect, useState } from "react";
import { tradeAdminList } from "@/services/api/tradeApi";
import type { TradeMeta } from "@/services/trade-types";
export function useTradeAdmin<T>(
  path: string,
  query: Record<string, unknown> = {},
) {
  const [rows, setRows] = useState<T[]>([]),
    [meta, setMeta] = useState<TradeMeta>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const key = JSON.stringify(query);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const result = await tradeAdminList<T>(path, JSON.parse(key));
        if (!cancelled) {
          setRows(result.data);
          setMeta(result.meta);
          setError("");
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Không tải được dữ liệu giao thương.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, key, revision]);
  return {
    rows,
    meta,
    loading,
    error,
    refresh: () => setRevision((v) => v + 1),
  };
}
export function useTradeTask() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return {
    busy,
    error,
    run: async (action: () => Promise<void>) => {
      setBusy(true);
      setError("");
      try {
        await action();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Không thực hiện được thao tác.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
