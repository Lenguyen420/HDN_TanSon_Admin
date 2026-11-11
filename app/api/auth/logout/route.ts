import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "admin_session",
  "admin_access_token",
  "admin_refresh_token",
];

export async function POST(request: NextRequest) {
  const acceptsJson = request.headers.get("accept")?.includes("application/json");
  const response = acceptsJson
    ? NextResponse.json({ success: true, message: "Đã đăng xuất." })
    : NextResponse.redirect(new URL("/login", request.url), {
        status: 303,
      });

  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
