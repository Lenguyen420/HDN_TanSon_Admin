import { ensureStoredAdminToken } from "@/services/auth.service";

export type AdminRecord = Record<string, unknown>;

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ListQuery = {
  page?: number;
  size?: number;
  limit?: number;
  keyword?: string;
  status?: string;
  [key: string]: string | number | undefined;
};

const API_URL = "https://be.government.kidoedu.vn";

function isRecord(value: unknown): value is AdminRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    isRecord(value) &&
    "success" in value &&
    "message" in value &&
    "data" in value
  );
}

function unwrapApiResponse<T>(value: unknown): T {
  if (isApiResponse<T>(value)) {
    return value.data;
  }

  return value as T;
}

function buildQuery(query?: ListQuery) {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

async function getHeaders(hasJsonBody = false): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = await ensureStoredAdminToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function getErrorMessage(value: unknown, fallback: string) {
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

async function readBody(response: Response): Promise<unknown> {
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

export async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(body, `API request failed: ${response.status}`));
  }

  return body as T;
}

export function normalizeList(value: unknown): AdminRecord[] {
  const unwrapped = unwrapApiResponse<unknown>(value);

  if (Array.isArray(unwrapped)) {
    return unwrapped as AdminRecord[];
  }

  if (!isRecord(unwrapped)) {
    return [];
  }

  const candidates = [
    unwrapped.items,
    unwrapped.data,
    unwrapped.users,
    unwrapped.meetings,
    unwrapped.documents,
    unwrapped.devices,
    unwrapped.rooms,
    unwrapped.attachments,
    unwrapped.zones,
    unwrapped.reports,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as AdminRecord[];
    }
  }

  return [];
}

export function normalizeSingle(value: unknown): AdminRecord {
  const unwrapped = unwrapApiResponse<unknown>(value);

  if (isRecord(unwrapped)) {
    return unwrapped;
  }

  return {};
}

export async function getAdminOptions(path: string): Promise<AdminRecord> {
  const body = await adminRequest<unknown>(path, {
    method: "GET",
    headers: await getHeaders(),
    cache: "no-store",
  });

  return normalizeSingle(body);
}

export async function listAdminResource(
  resource: string,
  query?: ListQuery,
): Promise<AdminRecord[]> {
  const body = await adminRequest<unknown>(`/${resource}${buildQuery(query)}`, {
    method: "GET",
    headers: await getHeaders(),
    cache: "no-store",
  });

  return normalizeList(body);
}

export async function getAdminResource(
  resource: string,
  id: string | number,
): Promise<AdminRecord> {
  const body = await adminRequest<unknown>(`/${resource}/${id}`, {
    method: "GET",
    headers: await getHeaders(),
    cache: "no-store",
  });

  return normalizeSingle(body);
}

export async function createAdminResource(
  resource: string,
  payload: AdminRecord,
): Promise<AdminRecord> {
  const body = await adminRequest<unknown>(`/${resource}`, {
    method: "POST",
    headers: await getHeaders(true),
    body: JSON.stringify(payload),
  });

  return normalizeSingle(body);
}

export async function updateAdminResource(
  resource: string,
  id: string | number,
  payload: AdminRecord,
  method: "PATCH" | "PUT" = "PATCH",
): Promise<AdminRecord> {
  const body = await adminRequest<unknown>(`/${resource}/${id}`, {
    method,
    headers: await getHeaders(true),
    body: JSON.stringify(payload),
  });

  return normalizeSingle(body);
}

export async function deleteAdminResource(
  resource: string,
  id: string | number,
): Promise<void> {
  await adminRequest<unknown>(`/${resource}/${id}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
}

export async function uploadAttachment(file: File): Promise<AdminRecord> {
  const formData = new FormData();
  formData.set("file", file);
  const token = await ensureStoredAdminToken();

  const body = await adminRequest<unknown>("/attachments/upload", {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return normalizeSingle(body);
}

export async function downloadBlob(path: string): Promise<Blob> {
  const token = await ensureStoredAdminToken();

  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await readBody(response);
    throw new Error(getErrorMessage(body, "Không thể tải tệp."));
  }

  return response.blob();
}
