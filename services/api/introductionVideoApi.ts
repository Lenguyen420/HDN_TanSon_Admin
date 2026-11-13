import { ApiError } from "./apiError.ts";
import axiosInstance from "./axiosConfig.ts";

export const managedVideoPattern =
  /^\/api\/v1\/public\/introduction-videos\/[a-f0-9-]{36}$/;
export const localVideoPattern =
  /^\/uploads\/introduction-videos\/[a-f0-9-]{36}\.(mp4|webm)$/;
export function youtubeVideoUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (
      ![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(url.hostname)
    )
      return null;
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.split("/")[1]
        : url.searchParams.get("v") ||
          url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    return id && /^[\w-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}
export function validateIntroductionVideo(file: File) {
  if (!/\.(mp4|webm)$/i.test(file.name))
    throw new Error("Chọn video MP4 hoặc WebM.");
  const type = /\.mp4$/i.test(file.name) ? "video/mp4" : "video/webm";
  if (file.type && file.type !== type)
    throw new Error("Định dạng video không khớp file MP4/WebM.");
  if (file.size < 12 || file.size > 100 * 1024 * 1024)
    throw new Error("Video phải có dung lượng từ 12 byte đến 100 MiB.");
}
const pending = new WeakMap<File, Promise<string>>();
const uploaded = new WeakMap<File, string>();
export function uploadIntroductionVideo(
  file: File,
  progress: (message: string) => void,
): Promise<string> {
  validateIntroductionVideo(file);
  const completed = uploaded.get(file);
  if (completed) return Promise.resolve(completed);
  const active = pending.get(file);
  if (active) return active;
  const task = (async () => {
    progress("Đang tải video lên hệ thống…");
    const type = /\.mp4$/i.test(file.name) ? "video/mp4" : "video/webm";
    const body = new FormData();
    body.append(
      "video",
      file.type ? file : new File([file], file.name, { type }),
    );
    try {
      const result = (
        await axiosInstance.post<{ data: { url: string } }>(
          "/association/introduction-videos/upload",
          body,
          {
            // Let the browser generate the multipart boundary.
            headers: { "Content-Type": false },
            timeout: 300000,
            onUploadProgress: ({ loaded, total }) => {
              if (total)
                progress(
                  "Đang tải video " +
                    Math.min(100, Math.round((loaded / total) * 100)) +
                    "%…",
                );
            },
          },
        )
      ).data.data;
      if (!localVideoPattern.test(result.url))
        throw new Error("Đường dẫn video không hợp lệ.");
      uploaded.set(file, result.url);
      progress("Đã lưu video.");
      return result.url;
    } catch (error) {
      // Vercel cannot accept a large multipart body or persist local uploads.
      if (
        error instanceof ApiError &&
        (error.statusCode === 413 ||
          (error.statusCode === 503 &&
            /Vercel|ổ đĩa bền vững/.test(error.message)))
      ) {
        const { uploadVideoChunks } =
          await import("./introductionVideoChunkUpload.ts");
        const url = await uploadVideoChunks(file, progress);
        uploaded.set(file, url);
        progress("Đã lưu video.");
        return url;
      }
      throw new Error(
        "Lưu video: " +
          (error instanceof Error ? error.message : "Không thể tải video."),
      );
    }
  })().finally(() => pending.delete(file));
  pending.set(file, task);
  return task;
}
export async function readIntroductionVideo(
  form: FormData,
  progress: (message: string) => void,
): Promise<string> {
  const value = String(form.get("introductionVideoUrl") || "").trim();
  if (form.get("introductionVideoMode") === "youtube") {
    if (value && !youtubeVideoUrl(value))
      throw new Error("Vui lòng nhập link YouTube hợp lệ.");
    return value;
  }
  const file = form.get("introductionVideoFile");
  if (file instanceof File && file.size)
    return uploadIntroductionVideo(file, progress);
  return value;
}
export function videoPreviewUrl(value: string) {
  return managedVideoPattern.test(value)
    ? value.replace("/api/v1/public/", "/uploads/")
    : value;
}
