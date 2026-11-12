import axiosInstance from "./axiosConfig.ts";

export const managedVideoPattern =
  /^\/api\/v1\/public\/introduction-videos\/[a-f0-9-]{36}$/;
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
  if (file.size < 12 || file.size > 100 * 1024 * 1024)
    throw new Error("Video phải có dung lượng từ 12 byte đến 100 MB.");
}
const pending = new WeakMap<File, Promise<string>>();
export function uploadIntroductionVideo(
  file: File,
  progress: (message: string) => void,
): Promise<string> {
  validateIntroductionVideo(file);
  const cached = pending.get(file);
  if (cached) return cached;
  const task = (async () => {
    let id = "";
    try {
      progress("Đang chuẩn bị tải video…");
      const started = (
        await axiosInstance.post<{
          data: { id: string; chunkSize: number; count: number };
        }>("/association/introduction-videos", {
          name: file.name,
          size: file.size,
        })
      ).data.data;
      id = started.id;
      if (
        !/^[a-f0-9-]{36}$/.test(id) ||
        started.chunkSize !== 2 * 1024 * 1024 ||
        started.count !== Math.ceil(file.size / started.chunkSize)
      )
        throw new Error("Máy chủ trả về phiên tải không hợp lệ.");
      for (let index = 0; index < started.count; index++) {
        const part = file.slice(
          index * started.chunkSize,
          Math.min(file.size, (index + 1) * started.chunkSize),
        );
        await axiosInstance.put(
          `/association/introduction-videos/${id}/chunks/${index}`,
          part,
          {
            headers: { "Content-Type": "application/octet-stream" },
            timeout: 60000,
          },
        );
        progress(
          `Đang tải video… ${Math.round((Math.min(file.size, (index + 1) * started.chunkSize) / file.size) * 100)}%`,
        );
      }
      const result = (
        await axiosInstance.post<{ data: { url: string } }>(
          `/association/introduction-videos/${id}/complete`,
          {},
        )
      ).data.data;
      if (!managedVideoPattern.test(result.url))
        throw new Error("Đường dẫn video không hợp lệ.");
      return result.url;
    } catch (error) {
      pending.delete(file);
      if (id)
        await axiosInstance
          .delete(`/association/introduction-videos/${id}`)
          .catch(() => undefined);
      throw error;
    }
  })();
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
