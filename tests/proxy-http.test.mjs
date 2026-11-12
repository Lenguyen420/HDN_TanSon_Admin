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
    let imageReads = 0;
    const imagePath =
      "/uploads/banners/00000000-0000-4000-8000-000000000002.webp";
    const fileBytes = Buffer.from([
      37, 80, 68, 70, 45, 49, 46, 52, 10, 0, 255, 128,
    ]);
    const fileId = "00000000-0000-4000-8000-000000000000";
    const backend = createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      if (req.url === `/api/v1/admin/introduction-videos/${fileId}/chunks/0`) {
        assert.equal(req.method, "PUT");
        assert.equal(req.headers.authorization, "Bearer test-access");
        assert.deepEqual(bytes, fileBytes);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true }));
      }
      if (req.url === `/api/v1/public/introduction-videos/${fileId}`) {
        assert.equal(req.headers.range, "bytes=2-5");
        res.writeHead(206, {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes 2-5/${fileBytes.length}`,
          "Content-Length": "4",
          "Accept-Ranges": "bytes",
        });
        return res.end(fileBytes.subarray(2, 6));
      }
      if (req.url === "/api/v1/admin/event-files") {
        assert.deepEqual(bytes, fileBytes);
        assert.equal(
          req.headers["x-file-name"],
          encodeURIComponent("Tài liệu.pdf"),
        );
        assert.equal(req.headers.authorization, "Bearer test-access");
        res.writeHead(201, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            data: { url: `/api/v1/public/event-files/${fileId}` },
          }),
        );
      }
      if (req.url === `/api/v1/public/event-files/${fileId}`) {
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Length": String(fileBytes.length),
          "Content-Disposition": "inline; filename=event.pdf",
        });
        return res.end(req.method === "HEAD" ? undefined : fileBytes);
      }
      if (req.url === imagePath) {
        imageReads++;
        res.writeHead(200, {
          "Content-Type": "image/webp",
          "Content-Length": String(fileBytes.length),
        });
        return res.end(fileBytes);
      }
      const text = bytes.toString();
      received.push({
        path: req.url,
        method: req.method,
        auth: req.headers.authorization,
        body: text ? JSON.parse(text) : undefined,
      });
      if (req.url.includes("connection-failure")) return req.socket.destroy();
      if (req.url === "/api/v1/admin/settings" && req.method === "PUT")
        await delay(16000);
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
      const videoPart = await fetch(
        base + `/api/association/introduction-videos/${fileId}/chunks/0`,
        {
          method: "PUT",
          headers: {
            Cookie: "admin_access_token=test-access",
            "Content-Type": "application/octet-stream",
          },
          body: fileBytes,
        },
      );
      assert.equal(videoPart.status, 200);
      for (let i = 0; i < 2; i++) {
        const image = await fetch(base + imagePath);
        assert.equal(image.status, 200);
        assert.deepEqual(Buffer.from(await image.arrayBuffer()), fileBytes);
      }
      assert.equal(
        imageReads,
        1,
        "immutable images are reused from the admin server cache",
      );
      const videoRange = await fetch(
        base + `/uploads/introduction-videos/${fileId}`,
        { headers: { Range: "bytes=2-5" } },
      );
      assert.equal(videoRange.status, 206);
      assert.equal(
        videoRange.headers.get("content-range"),
        `bytes 2-5/${fileBytes.length}`,
      );
      assert.deepEqual(
        Buffer.from(await videoRange.arrayBuffer()),
        fileBytes.subarray(2, 6),
      );
      const slowSave = await call("/api/association/settings", "PUT", {
        name: "Test Hội",
        slogan: "Test",
      });
      assert.equal(
        slowSave.status,
        200,
        "Save should allow a backend response taking more than 15 seconds",
      );
      assert.equal(received.at(-1).method, "PUT");
      assert.deepEqual(received.at(-1).body, {
        name: "Test Hội",
        slogan: "Test",
      });
      const connectionFailure = await call(
        "/api/association/news/connection-failure",
      );
      assert.equal(connectionFailure.status, 502);
      const failureMessage = (await connectionFailure.json()).message;
      assert.match(failureMessage, /ASSOCIATION_API_URL/);
      assert.doesNotMatch(failureMessage, /4000|MongoDB/);
      const uploaded = await fetch(base + "/api/association/event-files", {
        method: "POST",
        headers: {
          Cookie: "admin_access_token=test-access",
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent("Tài liệu.pdf"),
        },
        body: fileBytes,
      });
      assert.equal(uploaded.status, 201);
      assert.equal(
        (await uploaded.json()).data.url,
        `/api/v1/public/event-files/${fileId}`,
      );
      const downloaded = await fetch(base + `/uploads/event-files/${fileId}`);
      assert.equal(downloaded.headers.get("content-type"), "application/pdf");
      assert.equal(
        downloaded.headers.get("content-disposition"),
        "inline; filename=event.pdf",
      );
      assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), fileBytes);
      const head = await fetch(base + `/uploads/event-files/${fileId}`, {
        method: "HEAD",
      });
      assert.equal(
        head.headers.get("content-length"),
        String(fileBytes.length),
      );
      assert.equal((await head.arrayBuffer()).byteLength, 0);
    } finally {
      child.kill();
      if (child.exitCode === null) await once(child, "exit");
      backend.closeAllConnections();
      await new Promise((resolve) => backend.close(resolve));
    }
  },
);
