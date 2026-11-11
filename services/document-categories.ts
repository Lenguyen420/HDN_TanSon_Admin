import { ensureStoredAdminToken } from "@/services/auth.service";

export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
  };
  
  export type DocumentCategoryQuery = {
    page?: number;
    size?: number;
    keyword?: string;
  };
  
  export type PaginatedResponse<T> = {
    data?: T[];
    items?: T[];
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
  
  export type DocumentCategory = {
    id: string;
    createdAt?: string;
    updatedAt?: string;
    group?: string;
    name?: string;
    description?: string;
    order?: number;
  
    [key: string]: unknown;
  };
  
  export type CreateDocumentCategoryPayload = {
    group?: string;
    name: string;
    description?: string;
    order?: number;
  
    [key: string]: unknown;
  };
  
  export type UpdateDocumentCategoryPayload =
    Partial<CreateDocumentCategoryPayload>;
  
  const API_URL = "https://be.government.kidoedu.vn";const RESOURCE = "document-categories";
  
  if (!API_URL) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_API_URL. Hãy kiểm tra file .env.local và khởi động lại FE.",
    );
  }
  
  async function getHeaders(hasJsonBody = false): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
const token = await ensureStoredAdminToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }if (hasJsonBody) {
      headers["Content-Type"] = "application/json";
    }
  
    return headers;
  }
  
  function buildQueryString(query?: DocumentCategoryQuery): string {
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
  
  async function handleResponse<T>(response: Response): Promise<T> {
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
            message = body.message ?? body.error ?? message;
          }
        } catch {
          message = text;
        }
      }
  
      throw new Error(message);
    }
  
    if (response.status === 204 || !text) {
      return undefined as T;
    }
  
    return JSON.parse(text) as T;
  }
  
  function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
    return (
      typeof value === "object" &&
      value !== null &&
      "success" in value &&
      "message" in value &&
      "data" in value
    );
  }
  
  function unwrapApiResponse<T>(value: T | ApiResponse<T>): T {
    if (isApiResponse<T>(value)) {
      return value.data;
    }
  
    return value as T;
  }
  
  function normalizeListResponse(value: unknown): DocumentCategory[] {
    const unwrapped = unwrapApiResponse<unknown>(value as ApiResponse<unknown>);
  
    if (Array.isArray(unwrapped)) {
      return unwrapped as DocumentCategory[];
    }
  
    if (typeof unwrapped === "object" && unwrapped !== null) {
      const body = unwrapped as {
        data?: DocumentCategory[];
        items?: DocumentCategory[];
        total?: number;
        page?: number;
        size?: number;
      };
  
      const items = body.items ?? body.data ?? [];
  
      return Array.isArray(items) ? items : [];
    }
  
    return [];
  }
  
  function normalizeSingleResponse(value: unknown): DocumentCategory {
    const unwrapped = unwrapApiResponse<unknown>(value as ApiResponse<unknown>);
  
    if (
      typeof unwrapped === "object" &&
      unwrapped !== null &&
      !Array.isArray(unwrapped)
    ) {
      return unwrapped as DocumentCategory;
    }
  
    return {} as DocumentCategory;
  }
  
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, options);
  
    return handleResponse<T>(response);
  }
  
  // GET /document-categories
  export async function getDocumentCategories(
    query?: DocumentCategoryQuery,
  ): Promise<DocumentCategory[]> {
    const queryString = buildQueryString(query);
  
    const data = await request<unknown>(`/${RESOURCE}${queryString}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse(data);
  }
  
  // GET /document-categories/:id
  export async function getDocumentCategoryById(
    id: string | number,
  ): Promise<DocumentCategory> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeSingleResponse(data);
  }
  
  // POST /document-categories
  export async function createDocumentCategory(
    payload: CreateDocumentCategoryPayload,
  ): Promise<DocumentCategory> {
    const data = await request<unknown>(`/${RESOURCE}`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse(data);
  }
  
  // PATCH /document-categories/:id
  export async function updateDocumentCategory(
    id: string | number,
    payload: UpdateDocumentCategoryPayload,
  ): Promise<DocumentCategory> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse(data);
  }
  
  // DELETE /document-categories/:id
  export async function deleteDocumentCategory(
    id: string | number,
  ): Promise<void> {
    await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  }