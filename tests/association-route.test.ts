import test from "node:test";
import assert from "node:assert/strict";
import { resolveAssociationRoute } from "../lib/association-route.ts";

test("shared route preserves collection CRUD URLs and registration decisions", () => {
  for (const collection of [
    "members",
    "registrations",
    "news",
    "events",
    "member-visits",
    "notifications",
    "banners",
  ]) {
    for (const method of ["GET", "POST"])
      assert.deepEqual(resolveAssociationRoute(method, [collection]), {
        path: `/admin/${collection}`,
      });
    for (const method of ["GET", "PUT", "DELETE"])
      assert.deepEqual(
        resolveAssociationRoute(method, [collection, "record-1"]),
        { path: `/admin/${collection}/record-1` },
      );
  }
  for (const action of ["approve", "reject"])
    assert.deepEqual(
      resolveAssociationRoute("POST", ["registrations", "id-1", action]),
      { path: `/admin/registrations/id-1/${action}` },
    );
  for (const collection of ["members", "registrations"])
    assert.deepEqual(resolveAssociationRoute("POST", [collection, "import"]), {
      path: `/admin/${collection}/import`,
    });
});

test("settings exposes only its two supported methods", () => {
  for (const method of ["GET", "PUT"])
    assert.deepEqual(resolveAssociationRoute(method, ["settings"]), {
      path: "/admin/settings",
    });
  assert.equal(resolveAssociationRoute("POST", ["settings"]).status, 405);
  assert.equal(resolveAssociationRoute("DELETE", ["settings"]).status, 405);
  assert.equal(resolveAssociationRoute("GET", ["settings", "id"]).status, 404);
});

test("proxy rejects unknown APIs, traversal, extra segments and unsupported operations", () => {
  for (const segments of [
    [],
    ["auth"],
    ["admin"],
    ["banners", ".."],
    ["banners", "a/b"],
    ["banners", "%2e%2e"],
    ["banners", "id", "approve"],
    ["registrations", "id", "unknown"],
    ["registrations", "id", "approve", "extra"],
  ])
    assert.equal(
      resolveAssociationRoute("GET", segments).status,
      404,
      JSON.stringify(segments),
    );
  for (const [method, segments] of [
    ["PUT", ["banners"]],
    ["DELETE", ["members"]],
    ["POST", ["banners", "id"]],
    ["GET", ["registrations", "id", "approve"]],
    ["GET", ["members", "import"]],
  ] as const)
    assert.equal(resolveAssociationRoute(method, [...segments]).status, 405);
});


test("registration inbox is an authenticated proxy target with GET only", () => {
  assert.deepEqual(resolveAssociationRoute("GET", ["registration-inbox"]), {path: "/admin/registration-inbox"});
  assert.equal(resolveAssociationRoute("POST", ["registration-inbox"]).status, 405);
  assert.equal(resolveAssociationRoute("GET", ["registration-inbox", "id"]).status, 404);
});
