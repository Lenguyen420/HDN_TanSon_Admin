import test from "node:test";
import assert from "node:assert/strict";
import { resolveAssociationRoute } from "../lib/association-route.ts";

test("LocalGo reuses the proxy with exact backend reads, writes and visibility actions", () => {
  const cases = [
    ["GET", ["localgo", "categories"], "/localgo/categories"],
    ["POST", ["localgo", "categories"], "/admin/localgo/categories"],
    ["PATCH", ["localgo", "categories", "the-thao"], "/admin/localgo/categories/the-thao"],
    ["DELETE", ["localgo", "categories", "the-thao"], "/admin/localgo/categories/the-thao"],
    ["GET", ["localgo", "places"], "/admin/localgo/places"],
    ["GET", ["localgo", "places", "place-1"], "/admin/localgo/places/place-1"],
    ["POST", ["localgo", "places"], "/localgo/places"],
    ["PATCH", ["localgo", "places", "place-1"], "/localgo/places/place-1"],
    ["DELETE", ["localgo", "places", "place-1"], "/localgo/places/place-1"],
    ["PATCH", ["localgo", "places", "place-1", "hide"], "/admin/localgo/places/place-1/hide"],
    ["PATCH", ["localgo", "places", "place-1", "visibility"], "/localgo/places/place-1/visibility"],
  ] as const;
  for (const [method, segments, path] of cases)
    assert.deepEqual(resolveAssociationRoute(method, [...segments]), { path });
  for (const segments of [
    ["localgo"], ["localgo", "categories", "an-uong", "extra"],
    ["localgo", "places", ".."], ["localgo", "places", "a/b"],
    ["localgo", "places", "id", "approve"],
    ["localgo", "places", "id", "hide", "extra"],
  ]) assert.equal(resolveAssociationRoute("GET", segments).status, 404);
  for (const [method, segments] of [
    ["PUT", ["localgo", "categories"]],
    ["GET", ["localgo", "categories", "the-thao"]],
    ["DELETE", ["localgo", "places"]],
    ["PUT", ["localgo", "places", "id"]],
    ["GET", ["localgo", "places", "id", "hide"]],
  ] as const) assert.equal(resolveAssociationRoute(method, [...segments]).status, 405);
});

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

test("event inbox and attendance roster are read-only admin proxy targets", () => {
  assert.deepEqual(resolveAssociationRoute("GET", ["event-inbox"]), {path:"/admin/event-inbox"});
  assert.equal(resolveAssociationRoute("POST", ["event-inbox"]).status,405);
  assert.equal(resolveAssociationRoute("GET", ["event-inbox","id"]).status,404);
  assert.deepEqual(resolveAssociationRoute("GET", ["events","event-1","attendance"]), {path:"/admin/events/event-1/attendance"});
  assert.equal(resolveAssociationRoute("POST", ["events","event-1","attendance"]).status,405);
});
