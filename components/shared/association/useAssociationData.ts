"use client";
import { notify } from "@/lib/notify";
import { useEffect, useState } from "react";
import {
  readAssociationData,
  subscribeAssociationData,
  type AssociationData,
} from "@/services/association-store";
import {
  listMembers,
  listRegistrations,
  listContent,
  getAssociationSettings,
  subscribeMembers,
} from "@/services/association-api";
export function useAssociationData() {
  const [data, setData] = useState<AssociationData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      try {
        const local = readAssociationData();
        const [members, registrations, content, settings] = await Promise.all([
          listMembers(),
          listRegistrations(),
          listContent(),
          getAssociationSettings(),
        ]);
        if (cancelled || current !== revision) return;
        setData({
          ...local,
          settings,
          collections: {
            ...local.collections,
            ...content,
            members,
            registrations,
          },
        });
        setError("");
      } catch (cause) {
        if (cancelled || current !== revision) return;
        setData(null);
        const message =
          cause instanceof Error ? cause.message : "Không tải được dữ liệu.";
        setError(message);
        notify.error(message);
      }
    };
    const timer = setTimeout(() => void load(), 0);
    const unsubscribe = subscribeAssociationData(() => void load());
    const unsubscribeMembers = subscribeMembers(() => void load());
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
      unsubscribeMembers();
    };
  }, []);
  return { data, error };
}
