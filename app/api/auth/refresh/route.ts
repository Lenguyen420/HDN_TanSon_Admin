import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL =
  process.env.ADMIN_AUTH_API_URL?.trim().replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ??
  "";

const ACCESS_TOKEN_KEYS = new Set(["token", "accesstoken", "jwt"]);
const REFRESH_TOKEN_KEYS = new Set(["refreshtoken", "refresh"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findTokenByKey(
  value: unknown,
  keys: Set<string>,
  seen = new WeakSet<object>(),
): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findTokenByKey(item, keys, seen);

      if (token) {
        return token;
      }
    }

    return null;
  }

  if (!isRecord(value) || seen.has(value)) {
    return null;
  }

  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (keys.has(normalizeKey(key)) && typeof child === "string") {
      const token = child.trim();

      if (token) {
        return token;
      }
    }

    const nestedToken = findTokenByKey(child, keys, seen);

    if (nestedToken) {
      return nestedToken;
    }
  }

  return null;
}

function findExpiresIn(value: unknown): number | null {
  if (!isRecord(value)) {
    return null;
  }

  const direct = value.expiresIn;

  if (typeof direct === "number" && Number.isFinite(direct)) {
    return direct;
  }

  if (isRecord(value.data)) {
    return findExpiresIn(value.data);
  }

  return null;
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");

  return response;
}

function setAuthCookies(
  response: NextResponse,
  accessToken?: string | null,
  refreshToken?: string | null,
  expiresIn?: number | null,
) {
  const secure = process.env.NODE_ENV === "production";
  const accessMaxAge = Math.max(60, Math.floor(expiresIn ?? 15 * 60));

  response.cookies.set({
    name: "admin_session",
    value: "active",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  if (accessToken) {
    response.cookies.set({
      name: "admin_access_token",
      value: accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: accessMaxAge,
    });
  }

  if (refreshToken) {
    response.cookies.set({
      name: "admin_refresh_token",
      value: refreshToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("admin_refresh_token")?.value;

  if (!BACKEND_API_URL || !refreshToken) {
    return jsonNoStore({ message: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }

  const backendResponse = await fetch(`${BACKEND_API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${refreshToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  const body = await readResponseBody(backendResponse);

  if (!backendResponse.ok) {
    const response = jsonNoStore(body, { status: backendResponse.status });
    const retryAfter = backendResponse.headers.get("Retry-After");

    if (retryAfter) {
      response.headers.set("Retry-After", retryAfter);
    }

    return response;
  }

  const accessToken = findTokenByKey(body, ACCESS_TOKEN_KEYS);
  const nextRefreshToken = findTokenByKey(body, REFRESH_TOKEN_KEYS) ?? refreshToken;
  const expiresIn = findExpiresIn(body);

  const response = jsonNoStore({
    success: true,
    message: "Làm mới phiên đăng nhập thành công.",
    data: {
      accessToken,
      token: accessToken,
      refreshToken: nextRefreshToken,
      expiresIn,
    },
  });

  setAuthCookies(response, accessToken, nextRefreshToken, expiresIn);

  return response;
}
