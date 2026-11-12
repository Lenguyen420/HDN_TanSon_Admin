// Next.js may normalize nextUrl.hostname to localhost behind a proxy. Host is
// the browser's actual destination and cannot be overridden by browser scripts.
export function isSameOrigin(request: { headers: Headers; nextUrl: URL }) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host") || request.nextUrl.host;
  if (/[\s/@,]/.test(host)) return false;
  try {
    return origin === new URL(request.nextUrl.protocol + "//" + host).origin;
  } catch {
    return false;
  }
}
