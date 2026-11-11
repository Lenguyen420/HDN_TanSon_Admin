import { NextRequest } from "next/server";
import { backendUrl, json, unavailable } from "@/lib/backend";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (
    path.length !== 2 ||
    !["news", "events", "member-visits", "banners"].includes(path[0]) ||
    !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path[1])
  )
    return json({ message: "Không tìm thấy ảnh." }, 404);
  try {
    const url = new URL(
      "/uploads/" + path.map(encodeURIComponent).join("/"),
      backendUrl("/"),
    );
    const response = await fetch(url, {
      method: request.method,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
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
    const length = response.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: 200,
      headers,
    });
  } catch {
    return unavailable();
  }
}
export { handle as GET, handle as HEAD };
