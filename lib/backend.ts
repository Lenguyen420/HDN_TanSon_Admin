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
    signal: AbortSignal.timeout(45000),
    headers: { Accept: "application/json", ...options.headers },
  });
}
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function unavailable(error?: unknown) {
  const failure = error instanceof Error ? error : undefined;
  const cause = failure?.cause as { code?: unknown } | undefined;
  const timedOut =
    failure?.name === "TimeoutError" ||
    [
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
      "ETIMEDOUT",
    ].includes(String(cause?.code));
  // Do not log request bodies, cookies, tokens, or connection strings.
  console.error("[Backend proxy]", {
    name: failure?.name ?? "InvalidResponse",
    code: typeof cause?.code === "string" ? cause.code : undefined,
  });
  return json(
    {
      message: timedOut
        ? "Backend phản hồi quá lâu. Hãy kiểm tra lại dữ liệu đã lưu trước khi thử lại."
        : "Admin không kết nối được backend. Kiểm tra kết nối mạng và cấu hình ASSOCIATION_API_URL trong terminal chạy admin.",
    },
    timedOut ? 504 : 502,
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
