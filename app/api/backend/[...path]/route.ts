import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ??
  "";

const ADMIN_AUTH_API_URL =
  process.env.ADMIN_AUTH_API_URL?.trim().replace(/\/$/, "") ?? BACKEND_API_URL;

const ACCESS_TOKEN_KEYS = new Set(["token", "accesstoken", "jwt"]);
const REFRESH_TOKEN_KEYS = new Set(["refreshtoken", "refresh"]);

type RouteParams = {
  params: Promise<{
    path: string[];
  }>;
};

type TokenPayload = {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
};

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

function setAuthCookies(response: NextResponse, payload: TokenPayload) {
  const secure = process.env.NODE_ENV === "production";
  const accessMaxAge = Math.max(60, Math.floor(payload.expiresIn ?? 15 * 60));

  response.cookies.set({
    name: "admin_session",
    value: "active",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  if (payload.accessToken) {
    response.cookies.set({
      name: "admin_access_token",
      value: payload.accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: accessMaxAge,
    });
  }

  if (payload.refreshToken) {
    response.cookies.set({
      name: "admin_refresh_token",
      value: payload.refreshToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

function copyResponseHeaders(source: Response) {
  const headers = new Headers();

  for (const [key, value] of source.headers.entries()) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey === "content-type" ||
      normalizedKey === "content-disposition" ||
      normalizedKey === "retry-after"
    ) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function refreshAccessToken(request: NextRequest): Promise<TokenPayload | null> {
  const refreshToken = request.cookies.get("admin_refresh_token")?.value;

  if (!refreshToken || !ADMIN_AUTH_API_URL) {
    return null;
  }

  const response = await fetch(`${ADMIN_AUTH_API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${refreshToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const body = await readJson(response);

  return {
    accessToken: findTokenByKey(body, ACCESS_TOKEN_KEYS),
    refreshToken: findTokenByKey(body, REFRESH_TOKEN_KEYS) ?? refreshToken,
    expiresIn: findExpiresIn(body),
  };
}

function buildBackendHeaders(request: NextRequest, accessToken?: string | null) {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");

  headers.set("Accept", accept ?? "application/json");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const token = accessToken ?? request.cookies.get("admin_access_token")?.value;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function sendBackendRequest(
  request: NextRequest,
  backendUrl: URL,
  body: ArrayBuffer | undefined,
  accessToken?: string | null,
) {
  return fetch(backendUrl, {
    method: request.method,
    headers: buildBackendHeaders(request, accessToken),
    body,
    cache: "no-store",
  });
}

async function proxyToBackend(request: NextRequest, { params }: RouteParams) {
  if (!BACKEND_API_URL) {
    return NextResponse.json(
      { message: "Missing NEXT_PUBLIC_API_BASE_URL." },
      { status: 500 },
    );
  }

  const { path } = await params;
  const pathname = path.join("/");

  const incomingUrl = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_API_URL}/${pathname}`);
  backendUrl.search = incomingUrl.search;

  try {
    const hasRequestBody = !["GET", "HEAD"].includes(request.method);
    const body = hasRequestBody ? await request.arrayBuffer() : undefined;
    let backendResponse = await sendBackendRequest(request, backendUrl, body);

    let refreshedTokens: TokenPayload | null = null;

    if (backendResponse.status === 401) {
      refreshedTokens = await refreshAccessToken(request);

      if (refreshedTokens?.accessToken) {
        backendResponse = await sendBackendRequest(
          request,
          backendUrl,
          body,
          refreshedTokens.accessToken,
        );
      }
    }

    const response = new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: copyResponseHeaders(backendResponse),
    });

    if (refreshedTokens?.accessToken) {
      setAuthCookies(response, refreshedTokens);
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected backend error.";

    return NextResponse.json({ message }, { status: 502 });
  }
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const PATCH = proxyToBackend;
export const DELETE = proxyToBackend;
