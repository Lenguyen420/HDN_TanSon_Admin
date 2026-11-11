import "server-only";
import { NextRequest } from "next/server";
import {
  backendRequest,
  json,
  passResponse,
  sameOrigin,
  unavailable,
} from "@/lib/backend";
import type { ContentCollection } from "@/api/contentApi";
type Context = { params: Promise<{ path?: string[] }> };
export function contentProxy(collection: ContentCollection) {
  return async function handle(request: NextRequest, context: Context) {
    if (request.method !== "GET" && !sameOrigin(request))
      return json({ message: "Yêu cầu không hợp lệ." }, 403);
    const token = request.cookies.get("admin_access_token")?.value;
    if (!token) return json({ message: "Vui lòng đăng nhập." }, 401);
    const { path = [] } = await context.params;
    if (
      path.length > 1 ||
      path.some((part) => !/^[a-zA-Z0-9_-]{1,100}$/.test(part))
    )
      return json({ message: "Đường dẫn không hợp lệ." }, 404);
    if (
      (request.method === "POST" && path.length) ||
      (["PUT", "DELETE"].includes(request.method) && !path.length)
    )
      return json({ message: "Phương thức không hợp lệ." }, 405);
    const suffix = path.length ? "/" + encodeURIComponent(path[0]) : "";
    try {
      return await passResponse(
        await backendRequest(
          "/admin/" + collection + suffix + request.nextUrl.search,
          {
            method: request.method,
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            body: ["GET", "HEAD"].includes(request.method)
              ? undefined
              : await request.text(),
          },
        ),
      );
    } catch {
      return unavailable();
    }
  };
}
