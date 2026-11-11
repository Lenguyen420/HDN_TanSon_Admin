import { NextResponse } from "next/server";

const DEFAULT_LOGIN_ENDPOINT =
  "https://be.government.kidoedu.vn/auth/admin-login";

const ADMIN_AUTH_API_URL = process.env.ADMIN_AUTH_API_URL?.trim().replace(
  /\/$/,
  "",
);

const LOGIN_ENDPOINT =
  process.env.ADMIN_LOGIN_URL?.trim() ??
  (ADMIN_AUTH_API_URL
    ? `${ADMIN_AUTH_API_URL}/auth/admin-login`
    : DEFAULT_LOGIN_ENDPOINT);

const ACCESS_TOKEN_KEYS = new Set(["token", "accesstoken", "jwt"]);
const REFRESH_TOKEN_KEYS = new Set(["refreshtoken", "refresh"]);
const USE_FAKE_LOGIN = process.env.ADMIN_FAKE_LOGIN === "true";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
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

function getMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) {
    return fallback;
  }

  const message = value.message;

  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ") || fallback;
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (typeof value.error === "string" && value.error.trim()) {
    return value.error;
  }

  return fallback;
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

  if (!isRecord(value)) {
    return null;
  }

  if (seen.has(value)) {
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

function unwrapApiData(value: unknown): unknown {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }

  return value;
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

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonNoStore(
      { message: "Dữ liệu đăng nhập không hợp lệ." },
      { status: 400 },
    );
  }

  const username =
    isRecord(body) && typeof body.username === "string"
      ? body.username.trim()
      : "";
  const password =
    isRecord(body) && typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return jsonNoStore(
      { message: "Vui lòng nhập tên đăng nhập và mật khẩu." },
      { status: 400 },
    );
  }

  if (USE_FAKE_LOGIN) {
    const response = jsonNoStore({
      success: true,
      message: "Đăng nhập tạm thời thành công.",
      data: {
        token: "temporary-admin-token",
        expiresIn: 15 * 60,
        user: {
          username,
          role: "admin",
        },
      },
    });

    setAuthCookies(response, "temporary-admin-token", null, 15 * 60);

    return response;
  }

  try {
    const backendResponse = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const responseBody = await readResponseBody(backendResponse);

    if (!backendResponse.ok) {
      const response = jsonNoStore(
        {
          message: getMessage(responseBody, "Đăng nhập không thành công."),
        },
        { status: backendResponse.status },
      );
      const retryAfter = backendResponse.headers.get("Retry-After");

      if (retryAfter) {
        response.headers.set("Retry-After", retryAfter);
      }

      return response;
    }

    const accessToken = findTokenByKey(responseBody, ACCESS_TOKEN_KEYS);
    const refreshToken = findTokenByKey(responseBody, REFRESH_TOKEN_KEYS);
    const expiresIn = findExpiresIn(responseBody);
    const rawData = unwrapApiData(responseBody);
    const data = isRecord(rawData)
      ? {
          ...rawData,
          accessToken: rawData.accessToken ?? rawData.token ?? accessToken,
          token: rawData.token ?? rawData.accessToken ?? accessToken,
          refreshToken: rawData.refreshToken ?? refreshToken,
          expiresIn: rawData.expiresIn ?? expiresIn,
        }
      : {
          accessToken,
          token: accessToken,
          refreshToken,
          expiresIn,
        };
    const response = jsonNoStore({
      success: true,
      message: getMessage(responseBody, "Đăng nhập thành công."),
      data,
    });

    setAuthCookies(response, accessToken, refreshToken, expiresIn);

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể kết nối máy chủ.";

    return jsonNoStore({ message }, { status: 502 });
  }
}
