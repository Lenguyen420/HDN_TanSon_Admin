import { NextRequest } from "next/server";
import {
  backendRequest,
  json,
  passResponse,
  sameOrigin,
  unavailable,
} from "@/lib/backend";

async function handle(request: NextRequest) {
  if (request.method !== "GET" && !sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const token = request.cookies.get("admin_access_token")?.value;
  if (!token) return json({ message: "Vui lòng đăng nhập." }, 401);
  try {
    return await passResponse(
      await backendRequest("/admin/settings" + request.nextUrl.search, {
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
export { handle as GET, handle as PUT };
