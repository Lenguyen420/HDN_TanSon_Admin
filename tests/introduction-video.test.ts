import test from "node:test";
import assert from "node:assert/strict";
import { AxiosHeaders } from "axios";
import { ApiError } from "../services/api/apiError.ts";
import axiosInstance from "../services/api/axiosConfig.ts";
import {
  readIntroductionVideo,
  validateIntroductionVideo,
  youtubeVideoUrl,
} from "../services/api/introductionVideoApi.ts";
import { resolveAssociationRoute } from "../lib/association-route.ts";

test("video upload splits binary into 2 MB chunks and completes before settings save", async () => {
  const id = "00000000-0000-4000-8000-000000000000",
    url = `/api/v1/public/introduction-videos/${id}`;
  const calls: string[] = [];
  axiosInstance.defaults.adapter = async (config) => {
    calls.push(config.method + " " + config.url);
    if (config.method === "put") {
      assert.equal(
        config.headers.get("Content-Type"),
        "application/octet-stream",
      );
      assert.ok(config.data instanceof Blob);
      assert.ok(config.data.size <= 2 * 1024 * 1024);
    }
    const data = config.url?.endsWith("/complete")
      ? { url }
      : { id, chunkSize: 2 * 1024 * 1024, count: 3 };
    return {
      config,
      data: { data },
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
    };
  };
  const form = new FormData();
  form.set("introductionVideoMode", "file");
  form.set(
    "introductionVideoFile",
    new File([new Uint8Array(5 * 1024 * 1024)], "intro.mp4"),
  );
  const progress: string[] = [];
  assert.equal(
    await readIntroductionVideo(form, (message) => progress.push(message)),
    url,
  );
  assert.equal(progress.at(-1), "Đã tải xong video.");
  assert.deepEqual(calls, [
    "post /association/introduction-videos",
    ...[0, 1, 2].map(
      (i) => `put /association/introduction-videos/${id}/chunks/${i}`,
    ),
    `post /association/introduction-videos/${id}/complete`,
  ]);
  assert.equal(await readIntroductionVideo(form, () => {}), url);
  assert.equal(calls.length, 5);
});
test("YouTube, empty and existing managed video values; reject invalid files", async () => {
  for (const value of [
    "https://youtu.be/M7lc1UVf-VE",
    "https://www.youtube.com/watch?v=M7lc1UVf-VE",
  ]) {
    assert.equal(
      youtubeVideoUrl(value),
      "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
    );
    const form = new FormData();
    form.set("introductionVideoMode", "youtube");
    form.set("introductionVideoUrl", value);
    assert.equal(await readIntroductionVideo(form, () => {}), value);
  }
  assert.equal(
    youtubeVideoUrl("https://youtube.com.evil.example/watch?v=M7lc1UVf-VE"),
    null,
  );
  const form = new FormData();
  form.set("introductionVideoMode", "youtube");
  form.set("introductionVideoUrl", "https://example.com");
  await assert.rejects(
    readIntroductionVideo(form, () => {}),
    /YouTube/,
  );
  form.set("introductionVideoUrl", "");
  assert.equal(await readIntroductionVideo(form, () => {}), "");
  form.set("introductionVideoMode", "file");
  form.set(
    "introductionVideoUrl",
    "/api/v1/public/introduction-videos/00000000-0000-4000-8000-000000000000",
  );
  assert.equal(
    await readIntroductionVideo(form, () => {}),
    form.get("introductionVideoUrl"),
  );
  assert.throws(
    () => validateIntroductionVideo(new File([new Uint8Array(20)], "bad.exe")),
    /MP4/,
  );
  assert.throws(
    () =>
      validateIntroductionVideo(
        new File([new Uint8Array(101 * 1024 * 1024)], "big.mp4"),
      ),
    /100 MB/,
  );
});
test("video upload errors cancel session, do not return an incomplete URL", async () => {
  const calls: string[] = [];
  axiosInstance.defaults.adapter = async (config) => {
    calls.push(config.method!);
    if (config.method === "put") throw new ApiError(400, "Upload failed");
    return {
      config,
      data: {
        data: {
          id: "00000000-0000-4000-8000-000000000000",
          chunkSize: 2 * 1024 * 1024,
          count: 1,
        },
      },
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
    };
  };
  const form = new FormData();
  form.set(
    "introductionVideoFile",
    new File([new Uint8Array(20)], "intro.mp4"),
  );
  await assert.rejects(readIntroductionVideo(form, () => {}));
  assert.deepEqual(calls, ["post", "put", "delete"]);
});
test("proxy only allows supported introduction video operations", () => {
  for (const [method, parts] of [
    ["POST", []],
    ["DELETE", ["id"]],
    ["POST", ["id", "complete"]],
    ["PUT", ["id", "chunks", "0"]],
  ] as const) {
    assert.ok(
      resolveAssociationRoute(method, ["introduction-videos", ...parts]).path,
    );
  }
  assert.equal(
    resolveAssociationRoute("GET", ["introduction-videos"]).status,
    405,
  );
  assert.equal(
    resolveAssociationRoute("PUT", [
      "introduction-videos",
      "id",
      "chunks",
      "bad",
    ]).status,
    404,
  );
});


test("20.8 MB upload resumes after a timeout without uploading acknowledged chunks again", async () => {
  const id = "00000000-0000-4000-8000-000000000000";
  const file = new File([new Uint8Array(Math.ceil(20.8 * 1024 * 1024))], "intro.mp4");
  const parts: number[] = []; let starts = 0, fail = true, completed = 0;
  axiosInstance.defaults.adapter = async config => {
    let data: unknown = { success: true };
    if (config.url?.endsWith("/introduction-videos")) { starts++; data = { id, chunkSize: 2097152, count: 11 }; }
    else if (config.url?.includes("/chunks/")) {
      const index = Number(config.url.split("/").at(-1)); parts.push(index);
      if (index === 2 && fail) { fail = false; throw new ApiError(504, "Timeout"); }
    } else if (config.url?.endsWith("/complete")) { completed++; data = { url: "/api/v1/public/introduction-videos/" + id }; }
    else if (config.method === "delete") assert.fail("Transient errors must keep the upload session");
    return { config, data: { data }, status: 200, statusText: "OK", headers: new AxiosHeaders() };
  };
  const form = new FormData(); form.set("introductionVideoFile", file);
  await assert.rejects(readIntroductionVideo(form, () => {}), new RegExp("phần 3/11"));
  const result = await readIntroductionVideo(form, () => {});
  assert.equal(result, "/api/v1/public/introduction-videos/" + id);
  assert.equal(starts, 1); assert.equal(completed, 1);
  assert.deepEqual(parts, [0, 1, 2, ...Array.from({ length: 9 }, (_, i) => i + 2)]);
});
