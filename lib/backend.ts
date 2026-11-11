import "server-only";
import { NextRequest, NextResponse } from "next/server";
const cookieNames = [
  "admin_session",
  "admin_access_token",
  "admin_refresh_token",
];
export function backendUrl(path: string) {
  const base = process.env.ASSOCIATION_API_URL?.trim().replace(/\/$/, "");
  if (!base) throw new Error("Chưa cấu hình ASSOCIATION_API_URL.");
  return base + path;
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return (
    (!origin || origin === request.nextUrl.origin) &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
export async function backendRequest(path: string, options: RequestInit = {}) {
  return fetch(backendUrl(path), {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json", ...options.headers },
  });
}
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function unavailable() {
  return json(
    {
      message:
        "Không kết nối được backend Hội. Vui lòng kiểm tra backend cổng 4000 và cấu hình MongoDB.",
    },
    502,
  );
}
export function clearCookies(response: NextResponse) {
  for (const name of cookieNames)
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  return response;
}
export function setCookies(
  response: NextResponse,
  data: { accessToken: string; refreshToken: string; expiresIn: number },
) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set("admin_access_token", data.accessToken, {
    ...options,
    maxAge: data.expiresIn,
  });
  response.cookies.set("admin_refresh_token", data.refreshToken, {
    ...options,
    maxAge: 7 * 86400,
  });
  response.cookies.set("admin_session", "active", {
    ...options,
    maxAge: 7 * 86400,
  });
  return response;
}
export async function passResponse(response: Response) {
  const body = await response
    .json()
    .catch(() => ({ message: "Backend trả dữ liệu không hợp lệ." }));
  const result = json(body, response.status);
  const retry = response.headers.get("retry-after");
  if (retry) result.headers.set("Retry-After", retry);
  return result;
}
