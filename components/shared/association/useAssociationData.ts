"use client";
import { notify } from "@/lib/notify";
import { useEffect, useState } from "react";
import {
  subscribeAssociationData,
  type AssociationData,
} from "@/services/association-store";
import {
  getCachedAssociationData,
  loadAssociationData,
  remoteCollections,
  subscribeRemoteData,
  type DataKey,
} from "@/services/association-data";
import type { Collection } from "@/services/association-store";
export function useAssociationData(
  options: { collections?: Collection[]; settings?: boolean } = {},
) {
  const scope = [
    ...new Set([
      ...(options.collections ?? []).filter((key) =>
        remoteCollections.includes(key),
      ),
      ...(options.settings ? ["settings"] : []),
    ]),
  ]
    .sort()
    .join(",");
  const [data, setData] = useState<AssociationData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const keys = scope ? (scope.split(",") as DataKey[]) : [];
    let cancelled = false;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      try {
        const cached = getCachedAssociationData(keys);
        if (cached && !cancelled && current === revision) setData(cached);
        const loaded = await loadAssociationData(keys);
        if (cancelled || current !== revision) return;
        setData(loaded);
        setError("");
      } catch (cause) {
        if (cancelled || current !== revision) return;
        const message =
          cause instanceof Error ? cause.message : "Không tải được dữ liệu.";
        setError(message);
        notify.error(message);
      }
    };
    const timer = setTimeout(() => void load(), 0);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    const unsubscribe = subscribeAssociationData(() => void load());
    const unsubscribeMembers = subscribeRemoteData((key) => {
      if (keys.includes(key)) void load();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      unsubscribe();
      unsubscribeMembers();
    };
  }, [scope]);
  return { data, error };
}
