import { NextRequest } from "next/server";
import {
  backendRequest,
  json,
  passResponse,
  sameOrigin,
  setCookies,
  unavailable,
} from "@/lib/backend";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    !body.username.trim() ||
    !body.password
  )
    return json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu." }, 400);
  try {
    const response = await backendRequest("/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: body.username.trim(),
        password: body.password,
      }),
    });
    if (!response.ok) return passResponse(response);
    const { data } = await response.json();
    if (!data?.accessToken || !data?.refreshToken) return unavailable();
    return setCookies(
      json({ data: { user: data.user, expiresIn: data.expiresIn } }),
      data,
    );
  } catch {
    return unavailable();
  }
}
