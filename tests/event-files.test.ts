import test from "node:test";
import assert from "node:assert/strict";
import axios from "../services/api/axiosConfig.ts";
import {
  readSelectedEventFiles,
  validateEventFile,
  MAX_EVENT_FILE_SIZE,
} from "../services/api/eventFilesApi.ts";

test("file selection uploads binary data and keeps existing files and optional blank rows", async () => {
  const form = new FormData();
  const values = [
    {
      id: "old",
      title: "File cũ",
      url: "https://example.com/old.pdf",
      file: new File([], ""),
    },
    {
      id: "new",
      title: "File mới",
      url: "",
      file: new File(["%PDF-1.4\nhello"], "Tài liệu.pdf", {
        type: "application/pdf",
      }),
    },
    { id: "blank", title: "", url: "", file: new File([], "") },
  ];
  for (const item of values)
    for (const [key, value] of Object.entries({ ...item, date: "" }))
      form.append(`event.documents:${key}`, value);
  let calls = 0;
  axios.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, "/association/event-files");
    assert.equal(
      config.headers.get("Content-Type"),
      "application/octet-stream",
    );
    assert.equal(
      decodeURIComponent(String(config.headers.get("X-File-Name"))),
      "Tài liệu.pdf",
    );
    assert.ok(config.data instanceof File);
    assert.equal(await config.data.text(), "%PDF-1.4\nhello");
    return {
      data: {
        data: {
          url: "/api/v1/public/event-files/00000000-0000-4000-8000-000000000000",
        },
      },
      status: 201,
      statusText: "Created",
      headers: {},
      config,
    };
  };
  const saved = await readSelectedEventFiles(form, "event.documents");
  assert.equal(calls, 1);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].url, values[0].url);
  assert.equal(saved[1].id, "new");
  assert.ok(saved[1].url.startsWith("/api/v1/public/event-files/"));
  await readSelectedEventFiles(form, "event.documents");
  assert.equal(calls, 1);
});

test("unsupported and oversized selections fail before uploading", () => {
  assert.throws(
    () => validateEventFile(new File(["bad"], "script.html")),
    /PDF/,
  );
  assert.throws(
    () =>
      validateEventFile(
        new File([new Uint8Array(MAX_EVENT_FILE_SIZE + 1)], "large.pdf"),
      ),
    /4 MB/,
  );
});
