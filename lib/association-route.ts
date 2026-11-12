const collections = new Set([
  "members",
  "registrations",
  "news",
  "events",
  "member-visits",
  "notifications",
  "banners",
  "settings",
  "registration-inbox",
  "event-files",
]);

type RouteResult =
  { path: string; status?: never } | { status: 404 | 405; path?: never };

// Explicit routing keeps the shared proxy limited to the admin APIs in use.
export function resolveAssociationRoute(
  method: string,
  segments: string[],
): RouteResult {
  const [collection, id, action] = segments;
  if (
    !collections.has(collection) ||
    segments.some((part) => !/^[a-zA-Z0-9_-]{1,100}$/.test(part)) ||
    segments.length > 3
  )
    return { status: 404 };

  let allowed: string[];
  if (collection === "event-files") {
    if (segments.length !== 1) return { status: 404 };
    allowed = ["POST"];
  } else if (collection === "registration-inbox") {
    if (segments.length !== 1) return { status: 404 };
    allowed = ["GET"];
  } else if (collection === "settings") {
    if (segments.length !== 1) return { status: 404 };
    allowed = ["GET", "PUT"];
  } else if (segments.length === 3) {
    if (
      collection !== "registrations" ||
      !["approve", "reject"].includes(action)
    )
      return { status: 404 };
    allowed = ["POST"];
  } else if (
    id === "import" &&
    ["members", "registrations"].includes(collection)
  ) {
    allowed = ["POST"];
  } else {
    allowed = id ? ["GET", "PUT", "DELETE"] : ["GET", "POST"];
  }
  if (!allowed.includes(method)) return { status: 405 };
  return { path: "/admin/" + segments.map(encodeURIComponent).join("/") };
}
