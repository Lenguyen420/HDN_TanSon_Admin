import axiosInstance from "./axiosConfig.ts";
import { ApiError } from "./apiError.ts";

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
type UploadSession = {
  id: string;
  chunkSize: number;
  count: number;
  completed: Set<number>;
  created: number;
  url?: string;
};
const pending = new WeakMap<File, Promise<string>>();
const sessions = new WeakMap<File, UploadSession>();
export function uploadIntroductionVideo(
  file: File,
  progress: (message: string) => void,
): Promise<string> {
  validateIntroductionVideo(file);
  const cached = pending.get(file);
  if (cached) return cached;
  const task = (async () => {
    let session = sessions.get(file);
    let stage = "Khởi tạo tải video";
    try {
      if (!session || Date.now() - session.created > 23 * 60 * 60 * 1000) {
        progress("Đang chuẩn bị tải video…");
        const started = (
          await axiosInstance.post<{
            data: { id: string; chunkSize: number; count: number };
          }>("/association/introduction-videos", {
            name: file.name,
            size: file.size,
            chunkSize: 256 * 1024,
          })
        ).data.data;
        if (
          !/^[a-f0-9-]{36}$/.test(started.id) ||
          ![256 * 1024, 2 * 1024 * 1024].includes(started.chunkSize) ||
          started.count !== Math.ceil(file.size / started.chunkSize)
        )
          throw new Error("Máy chủ trả về phiên tải không hợp lệ.");
        session = { ...started, completed: new Set(), created: Date.now() };
        sessions.set(file, session);
      }
      if (session.url) return session.url;
      const active = session;
      let next = 0;
      const failure: { index: number; error: unknown }[] = [];
      const report = () =>
        progress(
          "Đã tải video " +
            active.completed.size +
            "/" +
            active.count +
            " phần (" +
            Math.round((active.completed.size / active.count) * 100) +
            "%)…",
        );
      report();
      async function worker() {
        while (!failure.length) {
          const index = next++;
          if (index >= active.count) return;
          if (active.completed.has(index)) continue;
          try {
            await axiosInstance.put(
              "/association/introduction-videos/" +
                active.id +
                "/chunks/" +
                index,
              file.slice(
                index * active.chunkSize,
                Math.min(file.size, (index + 1) * active.chunkSize),
              ),
              {
                headers: { "Content-Type": "application/octet-stream" },
                timeout: 60000,
              },
            );
            active.completed.add(index);
            report();
          } catch (error) {
            failure.push({ index, error });
          }
        }
      }
      // Drain in-flight requests before retrying or deleting the session.
      // Acknowledged parts beyond a failed part are retained for the next save.
      await Promise.all(
        Array.from({ length: Math.min(3, active.count) }, () => worker()),
      );
      if (failure.length) {
        // A permanent error must not be hidden by another worker's timeout.
        const permanent = failure.find(
          ({ error }) =>
            !(error instanceof ApiError) ||
            !([0, 429].includes(error.statusCode) || error.statusCode >= 500),
        );
        const failed = permanent ?? failure[0];
        stage = "Tải video phần " + (failed.index + 1) + "/" + active.count;
        throw failed.error;
      }
      stage = "Hoàn tất video";
      progress("Đang hoàn tất video trên hệ thống…");
      const result = (
        await axiosInstance.post<{ data: { url: string } }>(
          "/association/introduction-videos/" + session.id + "/complete",
          {},
        )
      ).data.data;
      if (!managedVideoPattern.test(result.url))
        throw new Error("Đường dẫn video không hợp lệ.");
      session.url = result.url;
      progress("Đã tải xong video.");
      return result.url;
    } catch (error) {
      const recoverable =
        error instanceof ApiError &&
        (error.statusCode === 0 ||
          error.statusCode === 429 ||
          error.statusCode >= 500);
      if (!recoverable && session) {
        sessions.delete(file);
        // Cleanup must not hold the form in a loading state after the original failure.
        void axiosInstance
          .delete("/association/introduction-videos/" + session.id, {
            timeout: 5000,
          })
          .catch(() => undefined);
      }
      throw new Error(
        stage +
          ": " +
          (error instanceof Error ? error.message : "Không thể tải video.") +
          (recoverable && session
            ? " Bấm Lưu để tiếp tục phần chưa tải; giữ nguyên file đã chọn."
            : ""),
      );
    }
  })().finally(() => {
    pending.delete(file);
  });
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
