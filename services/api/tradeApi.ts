import api from "./axiosConfig.ts";
import { tradeQuery, type TradeResult } from "../trade-types.ts";
export async function tradeAdminRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<TradeResult<T>> {
  const result = await api.request<TradeResult<T>>({
    url: "/trade/admin/" + path,
    method,
    data: body,
  });
  return result.status === 204
    ? { success: true, data: undefined as T }
    : result.data;
}
export const tradeAdminList = <T>(
  path: string,
  query: Record<string, unknown> = {},
) => tradeAdminRequest<T[]>(path + tradeQuery(query));
export const tradeAdminMedia = (id: string) =>
  "/api/trade/media/" + encodeURIComponent(id);
