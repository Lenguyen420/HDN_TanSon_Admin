import { NextRequest } from "next/server";
import {
  backendRequest,
  json,
  passResponse,
  sameOrigin,
  unavailable,
} from "@/lib/backend";
import { resolveAssociationRoute } from "@/lib/association-route";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: Context) {
  if (request.method !== "GET" && !sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const token = request.cookies.get("admin_access_token")?.value;
  if (!token) return json({ message: "Vui lòng đăng nhập." }, 401);

  const { path } = await context.params;
  const route = resolveAssociationRoute(request.method, path);
  if (route.status)
    return json(
      {
        message:
          route.status === 404
            ? "Đường dẫn không hợp lệ."
            : "Phương thức không hợp lệ.",
      },
      route.status,
    );

  try {
    if (
      path[0] === "event-files" ||
      (path[0] === "introduction-videos" && path[2] === "chunks")
    ) {
      const maxBytes = (path[0] === "event-files" ? 4 : 2) * 1024 * 1024;
      const length = Number(request.headers.get("content-length"));
      if (length > maxBytes)
        return json(
          { message: "Phần tải lên vượt quá dung lượng cho phép." },
          413,
        );
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength > maxBytes)
        return json(
          { message: "Phần tải lên vượt quá dung lượng cho phép." },
          413,
        );
      return await passResponse(
        await backendRequest(route.path, {
          method: request.method,
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/octet-stream",
            "X-File-Name": request.headers.get("x-file-name") ?? "",
          },
          body: bytes,
        }),
      );
    }
    return await passResponse(
      await backendRequest(route.path + request.nextUrl.search, {
        method: request.method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: request.method === "GET" ? undefined : await request.text(),
      }),
    );
  } catch {
    return unavailable();
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
