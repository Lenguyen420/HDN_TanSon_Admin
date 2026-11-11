import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const AUTH_COOKIE_NAMES = ["admin_access_token", "admin_session"];
const DASHBOARD_PATH = "/";

function hasAuthCookie(request: NextRequest) {
  return AUTH_COOKIE_NAMES.some((name) => Boolean(request.cookies.get(name)));
}

function isProtectedPage(pathname: string) {
  return pathname === "/" || pathname.startsWith("/admin");
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith("/api/backend");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = hasAuthCookie(request);

  if (pathname === LOGIN_PATH) {
    if (!isAuthenticated) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  if (isProtectedApi(pathname) && !isAuthenticated) {
    return NextResponse.json(
      { message: "Vui lòng đăng nhập để tiếp tục." },
      { status: 401 },
    );
  }

  if (isProtectedPage(pathname) && !isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/api/backend/:path*"],
};
