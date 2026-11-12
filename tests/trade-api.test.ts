import test from "node:test";
import assert from "node:assert/strict";
import { AxiosHeaders } from "axios";
import api from "../services/api/axiosConfig.ts";
// Import the client through a small esbuild-free relative entry: its query and
// DTO helpers have no runtime dependency on Next.js.
import { tradeQuery, tradeStatusLabels } from "../services/trade-types.ts";
import { tradeAdminRequest } from "../services/api/tradeApi.ts";
test("trade query keeps booleans and zero prices while omitting empty filters", () => {
  const query = tradeQuery({
    page: 2,
    featured: false,
    minPrice: 0,
    status: "",
    search: "ưu đãi hội viên",
  });
  const params = new URLSearchParams(query.slice(1));
  assert.equal(params.get("featured"), "false");
  assert.equal(params.get("minPrice"), "0");
  assert.equal(params.has("status"), false);
  assert.equal(params.get("search"), "ưu đãi hội viên");
  assert.equal(tradeStatusLabels.PENDING, "Chờ Hội duyệt");
});
test("admin transport supports PATCH moderation and bodyless deletes using its HttpOnly proxy", async () => {
  const requests: { url?: string; method?: string; body?: unknown }[] = [];
  api.defaults.adapter = async (config) => {
    requests.push({
      url: config.url,
      method: config.method,
      body: config.data ? JSON.parse(config.data) : undefined,
    });
    assert.equal(config.headers.get("Authorization"), undefined);
    return {
      config,
      status: config.method === "delete" ? 204 : 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
      data:
        config.method === "delete"
          ? undefined
          : { success: true, data: { status: "REJECTED" } },
    };
  };
  const result = await tradeAdminRequest<{ status: string }>(
    "trade-posts/00000000-0000-4000-8000-000000000000/reject",
    "PATCH",
    { reason: "Bổ sung thông tin doanh nghiệp" },
  );
  assert.equal(result.data.status, "REJECTED");
  const deleted = await tradeAdminRequest(
    "trade-post-categories/00000000-0000-4000-8000-000000000000",
    "DELETE",
  );
  assert.equal(deleted.success, true);
  assert.equal(deleted.data, undefined);
  assert.deepEqual(requests[0].body, {
    reason: "Bổ sung thông tin doanh nghiệp",
  });
});
