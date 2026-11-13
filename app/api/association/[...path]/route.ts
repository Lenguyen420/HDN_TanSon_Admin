import { NextRequest } from "next/server";
import {
  backendRequest,
  json,
  passResponse,
  sameOrigin,
  unavailable,
} from "@/lib/backend";
import { resolveAssociationRoute } from "@/lib/association-route";

export const maxDuration = 300;

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
    if (path[0] === "registrations" && path[2] === "business-license") {
      const response = await backendRequest(route.path, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) return await passResponse(response);
      const type = response.headers.get("content-type") || "";
      if (!/^image\/(jpeg|png|webp)$/.test(type))
        return json({ message: "Ảnh giấy phép không hợp lệ." }, 502);
      const headers = new Headers({
        "Content-Type": type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      const length = response.headers.get("content-length");
      if (length) headers.set("Content-Length", length);
      return new Response(response.body, { status: response.status, headers });
    }
    if (path[0] === "introduction-videos" && path[1] === "upload") {
      const contentType = request.headers.get("content-type") || "";
      if (
        !/^multipart\/form-data\s*;.*boundary=/i.test(contentType) ||
        !request.body
      )
        return json({ message: "Vui lòng gửi file video bằng FormData." }, 400);
      const maxBytes = 101 * 1024 * 1024;
      if (Number(request.headers.get("content-length")) > maxBytes)
        return json({ message: "Video vượt quá dung lượng cho phép." }, 413);
      let size = 0;
      let exceeded = false;
      const body = request.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            size += chunk.byteLength;
            if (size > maxBytes) {
              exceeded = true;
              throw new Error("Upload limit exceeded");
            }
            controller.enqueue(chunk);
          },
        }),
      );
      const options: RequestInit & { duplex: "half" } = {
        method: "POST",
        duplex: "half",
        body,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": contentType,
        },
        signal: AbortSignal.timeout(300000),
      };
      try {
        return await passResponse(await backendRequest(route.path, options));
      } catch (error) {
        if (exceeded)
          return json({ message: "Video vượt quá dung lượng cho phép." }, 413);
        throw error;
      }
    }
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
  } catch (error) {
    return unavailable(error);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
