import test from "node:test";
import assert from "node:assert/strict";
import { AxiosHeaders } from "axios";
import { ApiError } from "../services/api/apiError.ts";
import axiosInstance from "../services/api/axiosConfig.ts";
import {
  readIntroductionVideo,
  uploadIntroductionVideo,
  validateIntroductionVideo,
  youtubeVideoUrl,
  videoPreviewUrl,
} from "../services/api/introductionVideoApi.ts";
import { resolveAssociationRoute } from "../lib/association-route.ts";

const url =
  "/uploads/introduction-videos/00000000-0000-4000-8000-000000000000.mp4";

test("save sends one multipart video, normalizes missing MIME and reuses a completed upload", async () => {
  const calls: string[] = [];
  axiosInstance.defaults.adapter = async (config) => {
    calls.push(config.method + " " + config.url);
    assert.ok(config.data instanceof FormData);
    assert.deepEqual([...config.data.keys()], ["video"]);
    const video = config.data.get("video") as File;
    assert.equal(video.name, "intro.mp4");
    assert.equal(video.type, "video/mp4");
    assert.equal(video.size, 24);
    assert.equal(config.headers.get("Content-Type"), false);
    assert.equal(config.timeout, 300000);
    config.onUploadProgress?.({
      loaded: 12,
      total: 24,
      bytes: 12,
      lengthComputable: true,
    });
    return {
      config,
      data: { data: { url } },
      status: 201,
      statusText: "Created",
      headers: new AxiosHeaders(),
    };
  };
  const form = new FormData();
  form.set("introductionVideoMode", "file");
  form.set(
    "introductionVideoFile",
    new File([new Uint8Array(24)], "intro.mp4"),
  );
  assert.deepEqual(calls, [], "selecting a file does not upload it");
  const progress: string[] = [];
  assert.equal(
    await readIntroductionVideo(form, (message) => progress.push(message)),
    url,
  );
  assert.ok(progress.some((message) => message.includes("50%")));
  assert.equal(progress.at(-1), "Đã lưu video.");
  assert.equal(await readIntroductionVideo(form, () => {}), url);
  assert.deepEqual(calls, ["post /association/introduction-videos/upload"]);
});

test("YouTube, empty and existing video values do not upload", async () => {
  axiosInstance.defaults.adapter = async () => {
    throw Error("Unexpected upload");
  };
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
  for (const value of [
    "",
    url,
    "/api/v1/public/introduction-videos/00000000-0000-4000-8000-000000000000",
  ]) {
    form.set("introductionVideoMode", "file");
    form.set("introductionVideoUrl", value);
    assert.equal(await readIntroductionVideo(form, () => {}), value);
  }
  assert.equal(videoPreviewUrl(url), url);
});

test("invalid file formats, MIME types and sizes fail before upload", () => {
  assert.throws(
    () => validateIntroductionVideo(new File([new Uint8Array(20)], "bad.exe")),
    /MP4/,
  );
  assert.throws(
    () =>
      validateIntroductionVideo(
        new File([new Uint8Array(20)], "intro.mp4", { type: "text/html" }),
      ),
    /khớp/,
  );
  assert.throws(
    () => validateIntroductionVideo(new File([new Uint8Array(11)], "tiny.mp4")),
    /100 MiB/,
  );
  assert.throws(
    () =>
      validateIntroductionVideo({
        name: "large.mp4",
        type: "video/mp4",
        size: 100 * 1024 * 1024 + 1,
      } as File),
    /100 MiB/,
  );
});

test("failed upload can be retried without calling legacy chunk endpoints", async () => {
  let attempts = 0;
  axiosInstance.defaults.adapter = async (config) => {
    attempts++;
    assert.equal(config.url, "/association/introduction-videos/upload");
    assert.equal(config.method, "post");
    if (attempts === 1) throw new ApiError(503, "Disk unavailable");
    return {
      config,
      data: { data: { url } },
      status: 201,
      statusText: "Created",
      headers: new AxiosHeaders(),
    };
  };
  const file = new File([new Uint8Array(20)], "intro.mp4");
  await assert.rejects(
    uploadIntroductionVideo(file, () => {}),
    /Disk unavailable/,
  );
  assert.equal(await uploadIntroductionVideo(file, () => {}), url);
  assert.equal(attempts, 2);
});

test("concurrent saves share the upload and reject unexpected returned URLs", async () => {
  let release!: () => void;
  let calls = 0;
  axiosInstance.defaults.adapter = async (config) => {
    calls++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      config,
      data: { data: { url: "https://unexpected.example/video.mp4" } },
      status: 201,
      statusText: "Created",
      headers: new AxiosHeaders(),
    };
  };
  const file = new File([new Uint8Array(20)], "intro.mp4");
  const first = uploadIntroductionVideo(file, () => {});
  const second = uploadIntroductionVideo(file, () => {});
  assert.equal(first, second);
  const failed = assert.rejects(first, /Đường dẫn/);
  await new Promise((resolve) => setImmediate(resolve));
  release();
  await failed;
  assert.equal(calls, 1);
});

test("proxy permits multipart upload and keeps legacy playback compatibility", () => {
  assert.equal(
    resolveAssociationRoute("POST", ["introduction-videos", "upload"]).path,
    "/admin/introduction-videos/upload",
  );
  assert.equal(
    resolveAssociationRoute("GET", ["introduction-videos", "upload"]).status,
    405,
  );
  assert.equal(
    resolveAssociationRoute("DELETE", ["introduction-videos", "upload"]).status,
    405,
  );
  for (const [method, parts] of [
    ["POST", []],
    ["DELETE", ["id"]],
    ["POST", ["id", "complete"]],
    ["PUT", ["id", "chunks", "0"]],
  ] as const)
    assert.ok(
      resolveAssociationRoute(method, ["introduction-videos", ...parts]).path,
    );
});
