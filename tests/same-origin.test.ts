import test from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "../lib/same-origin.ts";
test("same-origin writes use the browser Host when Next.js normalizes its internal hostname", () => {
  const request = (
    origin: string,
    host = "127.0.0.1:3005",
    site = "same-origin",
  ) => ({
    headers: new Headers({ origin, host, "sec-fetch-site": site }),
    nextUrl: new URL("http://localhost:3005/api/trade/admin/trade-posts"),
  });
  assert.equal(isSameOrigin(request("http://127.0.0.1:3005")), true);
  assert.equal(isSameOrigin(request("https://attacker.example")), false);
  assert.equal(
    isSameOrigin(
      request("http://127.0.0.1:3005", "127.0.0.1:3005", "cross-site"),
    ),
    false,
  );
  assert.equal(isSameOrigin(request("http://localhost:3005")), false);
  assert.equal(isSameOrigin(request("https://127.0.0.1:3005")), false);
  assert.equal(isSameOrigin(request("null")), false);
});
