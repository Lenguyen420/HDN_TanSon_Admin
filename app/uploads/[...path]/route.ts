import { NextRequest } from "next/server";
import { backendUrl, json, unavailable } from "@/lib/backend";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const isLocalVideo =
    path.length === 2 &&
    path[0] === "introduction-videos" &&
    /^[a-f0-9-]{36}\.(mp4|webm)$/.test(path[1]);
  const isLegacyVideo =
    path.length === 2 &&
    path[0] === "introduction-videos" &&
    /^[a-f0-9-]{36}$/.test(path[1]);
  const isVideo = isLegacyVideo || isLocalVideo;
  const isFile =
    path.length === 2 &&
    path[0] === "event-files" &&
    /^[a-f0-9-]{36}$/.test(path[1]);
  if (
    !isVideo &&
    !isFile &&
    (path.length !== 2 ||
      !["news", "events", "member-visits", "banners", "members", "localgo"].includes(path[0]) ||
      !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path[1]))
  )
    return json({ message: "Không tìm thấy ảnh." }, 404);
  try {
    const url = new URL(
      isLegacyVideo
        ? `/api/v1/public/introduction-videos/${path[1]}`
        : isFile
          ? `/api/v1/public/event-files/${path[1]}`
          : "/uploads/" + path.map(encodeURIComponent).join("/"),
      backendUrl("/"),
    );
    const response = await fetch(url, {
      method: request.method,
      headers:
        isVideo && request.headers.has("range")
          ? { Range: request.headers.get("range")! }
          : undefined,
      signal: AbortSignal.timeout(isVideo ? 300000 : 15000),
      // Image filenames are immutable UUIDs; binary ranges must stay separate.
      cache:
        !isVideo && !isFile && request.method === "GET"
          ? "force-cache"
          : "no-store",
      ...(!isVideo && !isFile && request.method === "GET"
        ? { next: { revalidate: 86400 } }
        : {}),
    });
    if (isVideo && response.status === 416)
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": response.headers.get("content-range") || "bytes */*",
        },
      });
    if (!response.ok)
      return json(
        { message: "Không tìm thấy ảnh." },
        response.status === 404 ? 404 : 502,
      );
    const headers = new Headers({
      "Content-Type":
        response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    if (isVideo)
      for (const name of ["content-range", "accept-ranges"]) {
        const value = response.headers.get(name);
        if (value) headers.set(name, value);
      }
    const length = response.headers.get("content-length");
    const disposition = response.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    if (isFile) headers.set("Content-Security-Policy", "sandbox");
    if (length) headers.set("Content-Length", length);
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return unavailable();
  }
}
export { handle as GET, handle as HEAD };
