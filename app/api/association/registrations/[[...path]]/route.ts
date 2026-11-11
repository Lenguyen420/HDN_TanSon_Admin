import { NextRequest } from "next/server";
import {
  backendRequest,
  json,
  passResponse,
  sameOrigin,
  unavailable,
} from "@/lib/backend";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: NextRequest, context: Context) {
  if (request.method !== "GET" && !sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const token = request.cookies.get("admin_access_token")?.value;
  if (!token) return json({ message: "Vui lòng đăng nhập." }, 401);
  const { path = [] } = await context.params;
  if (
    path.length > 2 ||
    path.some((part) => !/^[a-zA-Z0-9_-]{1,100}$/.test(part))
  )
    return json({ message: "Đường dẫn không hợp lệ." }, 404);
  if (
    path.length === 2 &&
    (!["approve", "reject"].includes(path[1]) || request.method !== "POST")
  )
    return json({ message: "Đường dẫn không hợp lệ." }, 404);
  const suffix = path.length
    ? "/" + path.map(encodeURIComponent).join("/")
    : "";
  if (path[0] === "import" && request.method !== "POST")
    return json({ message: "Phương thức không hợp lệ." }, 405);
  try {
    return passResponse(
      await backendRequest(
        "/admin/registrations" + suffix + request.nextUrl.search,
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
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
