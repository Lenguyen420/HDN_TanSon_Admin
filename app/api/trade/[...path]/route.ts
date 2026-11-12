import { NextRequest } from "next/server";
import {
  backendRequest,
  json,
  passResponse,
  sameOrigin,
  unavailable,
} from "@/lib/backend";
type Context = { params: Promise<{ path: string[] }> };
const allowed =
  /^(?:admin\/(?:trade-posts(?:\/[a-f0-9-]{36}(?:\/(?:approve|reject|hide|unhide|archive|feature|analytics))?|\/analytics\/summary)?|trade-post-categories(?:\/(?:reorder|[a-f0-9-]{36}(?:\/status)?))?|reviews(?:\/(?:stats|[a-f0-9-]{36}(?:\/status)?))?|trade-conversations(?:\/[a-f0-9-]{36}(?:\/messages)?)?|trade-users(?:\/[a-f0-9-]{36})?|trade-notifications)|media\/[a-f0-9-]{36})$/;
async function handle(request: NextRequest, context: Context) {
  if (request.method !== "GET" && !sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const token = request.cookies.get("admin_access_token")?.value;
  if (!token) return json({ message: "Vui lòng đăng nhập." }, 401);
  const { path } = await context.params;
  const relative = path.join("/");
  if (!allowed.test(relative))
    return json({ message: "Không tìm thấy API giao thương." }, 404);
  const media = path[0] === "media";
  if (media && request.method !== "GET")
    return json({ message: "Phương thức không hỗ trợ." }, 405);
  try {
    const response = await backendRequest(
      (media ? "/trade-media/" + path[1] : "/" + relative) +
        request.nextUrl.search,
      {
        method: request.method,
        headers: {
          Authorization: "Bearer " + token,
          ...(!media ? { "Content-Type": "application/json" } : {}),
        },
        body: request.method === "GET" ? undefined : await request.text(),
      },
    );
    if (response.status === 204) return new Response(null, { status: 204 });
    if (media && response.ok)
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    return passResponse(response);
  } catch (error) {
    return unavailable(error);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
