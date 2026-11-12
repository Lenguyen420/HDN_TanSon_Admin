import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

test(
  "production proxy preserves URLs, payloads, authentication and error responses",
  { timeout: 30000 },
  async () => {
    const received = [];
    const backend = createServer(async (req, res) => {
      let text = "";
      for await (const chunk of req) text += chunk;
      received.push({
        path: req.url,
        method: req.method,
        auth: req.headers.authorization,
        body: text ? JSON.parse(text) : undefined,
      });
      res.setHeader("Content-Type", "application/json");
      if (req.url.includes("rate-limited")) {
        res.writeHead(429, { "Retry-After": "30" });
        res.end(JSON.stringify({ message: "Try later" }));
      } else {
        res.end(JSON.stringify({ data: { ok: true } }));
      }
    });
    backend.listen(0, "127.0.0.1");
    await once(backend, "listening");
    const reservation = createServer().listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise((resolve) => reservation.close(resolve));
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "-p",
        String(port),
        "-H",
        "127.0.0.1",
      ],
      {
        env: {
          ...process.env,
          ASSOCIATION_API_URL: `http://127.0.0.1:${backend.address().port}/api/v1`,
          NEXT_TELEMETRY_DISABLED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const base = `http://127.0.0.1:${port}`;
    const call = (path, method = "GET", body, headers = {}) =>
      fetch(base + path, {
        method,
        headers: {
          Cookie: "admin_access_token=test-access",
          "Content-Type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (child.exitCode !== null) throw new Error(output);
        try {
          await fetch(base + "/login");
          ready = true;
          break;
        } catch {
          await delay(50);
        }
      }
      assert.ok(ready, output);
      const noAuth = await fetch(base + "/api/association/banners");
      assert.equal(noAuth.status, 401);
      assert.equal(received.length, 0);
      for (const collection of [
        "members",
        "registrations",
        "news",
        "events",
        "member-visits",
        "notifications",
        "banners",
        "settings",
      ]) {
        assert.equal(
          (await call(`/api/association/${collection}?limit=100&page=1`))
            .status,
          200,
        );
        assert.equal(
          received.at(-1).path,
          `/api/v1/admin/${collection}?limit=100&page=1`,
        );
        assert.equal(received.at(-1).auth, "Bearer test-access");
      }
      const banner = {
        image: "uploads/banners/existing.webp",
        alt: "Updated",
        order: 3,
        status: "inactive",
      };
      assert.equal(
        (await call("/api/association/banners/banner-1", "PUT", banner)).status,
        200,
      );
      assert.deepEqual(received.at(-1).body, banner);
      assert.equal(received.at(-1).method, "PUT");
      for (const [action, body] of [
        ["approve", {}],
        ["reject", { reason: "Missing details" }],
      ]) {
        assert.equal(
          (
            await call(
              `/api/association/registrations/r1/${action}`,
              "POST",
              body,
            )
          ).status,
          200,
        );
        assert.deepEqual(received.at(-1).body, body);
      }
      const before = received.length;
      assert.equal((await call("/api/association/unknown")).status, 404);
      assert.equal(
        (await call("/api/association/settings", "DELETE")).status,
        405,
      );
      assert.equal(
        (
          await call(
            "/api/association/banners",
            "POST",
            {},
            { Origin: "https://untrusted.example" },
          )
        ).status,
        403,
      );
      assert.equal(received.length, before);
      const limited = await call("/api/association/banners/rate-limited");
      assert.equal(limited.status, 429);
      assert.equal(limited.headers.get("retry-after"), "30");
      assert.equal((await limited.json()).message, "Try later");
    } finally {
      child.kill();
      if (child.exitCode === null) await once(child, "exit");
      backend.closeAllConnections();
      await new Promise((resolve) => backend.close(resolve));
    }
  },
);
