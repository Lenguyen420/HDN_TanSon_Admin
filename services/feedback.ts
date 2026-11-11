import { ensureStoredAdminToken } from "@/services/auth.service";

export type AdminRecord = Record<string, unknown>;

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PaginatedApiResponse<T> = {
  data?: T[];
  items?: T[];
  feedbacks?: T[];
  feedbackTypes?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

const API_URL = "https://be.government.kidoedu.vn";

if (!API_URL) {
  throw new Error(
    "Thiếu NEXT_PUBLIC_API_BASE_URL. Hãy kiểm tra file .env.local và khởi động lại FE.",
  );
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

async function handleResponse<T>(
  response: Response,
): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    if (text) {
      try {
        const body = JSON.parse(text) as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(body.message)) {
          message = body.message.join(", ");
        } else {
          message =
            body.message ??
            body.error ??
            message;
        }
      } catch {
        message = text;
      }
    }

    throw new Error(message);
  }

  if (
    response.status === 204 ||
    !text
  ) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

function isApiResponse<T>(
  value: unknown,
): value is ApiResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "message" in value &&
    "data" in value
  );
}

function unwrapApiResponse<T>(
  value: T | ApiResponse<T>,
): T {
  if (isApiResponse<T>(value)) {
    return value.data;
  }

  return value as T;
}

function normalizeListResponse(
  value: unknown,
): AdminRecord[] {
  const unwrapped = unwrapApiResponse<unknown>(
    value as ApiResponse<unknown>,
  );

  if (Array.isArray(unwrapped)) {
    return unwrapped as AdminRecord[];
  }

  if (
    typeof unwrapped === "object" &&
    unwrapped !== null
  ) {
    const body =
      unwrapped as PaginatedApiResponse<AdminRecord>;

      const items =
      body.items ??
      body.feedbackTypes ??
      body.feedbacks ??
      body.data ??
      [];

    return Array.isArray(items) ? items : [];
  }

  return [];
}

function normalizeSingleResponse(
  value: unknown,
): AdminRecord {
  const unwrapped = unwrapApiResponse<unknown>(
    value as ApiResponse<unknown>,
  );

  if (
    typeof unwrapped === "object" &&
    unwrapped !== null &&
    !Array.isArray(unwrapped)
  ) {
    return unwrapped as AdminRecord;
  }

  return {};
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);

  return handleResponse<T>(response);
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

export function getRecordId(
  record: AdminRecord,
): string | number | undefined {
  const id =
    record.id ??
    record._id ??
    record.uuid;

  if (
    typeof id === "string" ||
    typeof id === "number"
  ) {
    return id;
  }

  return undefined;
}

export async function listResource(
  resource: string,
  params?: {
    keyword?: string;
    page?: number;
    size?: number;
  },
): Promise<AdminRecord[]> {
  const data = await request<unknown>(`/${resource}${buildQuery(params)}`, {
    method: "GET",
    headers: await getHeaders(),
    cache: "no-store",
  });

  return normalizeListResponse(data);
}

export async function getResourceById(
  resource: string,
  id: string | number,
): Promise<AdminRecord> {
  const data = await request<unknown>(
    `/${resource}/${id}`,
    {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    },
  );

  return normalizeSingleResponse(data);
}

export async function createResource(
  resource: string,
  payload: AdminRecord,
): Promise<AdminRecord> {
  const data = await request<unknown>(`/${resource}`, {
    method: "POST",
    headers: await getHeaders(true),
    body: JSON.stringify(payload),
  });

  return normalizeSingleResponse(data);
}

export async function updateResource(
  resource: string,
  id: string | number,
  payload: AdminRecord,
): Promise<AdminRecord> {
  const data = await request<unknown>(
    `/${resource}/${id}`,
    {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    },
  );

  return normalizeSingleResponse(data);
}

export async function deleteResource(
  resource: string,
  id: string | number,
): Promise<void> {
  await request<unknown>(`/${resource}/${id}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
}
