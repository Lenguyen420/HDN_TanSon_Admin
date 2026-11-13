import test from "node:test";
import assert from "node:assert/strict";
import { resolveAssociationRoute } from "../lib/association-route.ts";

test("license preview is an authenticated read-only registration proxy target", () => {
  assert.equal(
    resolveAssociationRoute("GET", [
      "registrations",
      "registration-id",
      "business-license",
    ]).path,
    "/admin/registrations/registration-id/business-license",
  );
  for (const method of ["POST", "PUT", "DELETE"])
    assert.equal(
      resolveAssociationRoute(method, [
        "registrations",
        "registration-id",
        "business-license",
      ]).status,
      405,
    );
  assert.equal(
    resolveAssociationRoute("GET", [
      "registrations",
      "registration-id",
      "business-license",
      "extra",
    ]).status,
    404,
  );
});
