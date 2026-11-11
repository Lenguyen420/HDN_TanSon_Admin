export function imageUrl(value: unknown): string {
  const source = String(value ?? "");
  return source.startsWith("uploads/") ? "/" + source : source;
}
