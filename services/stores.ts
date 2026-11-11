import { ensureStoredAdminToken } from "@/services/auth.service";

export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
  };
  
  export type StoreQuery = {
    page?: number;
    size?: number;
    keyword?: string;
  };
  
  export type PaginatedResponse<T> = {
    data?: T[];
    items?: T[];
    stores?: T[];
    total?: number;
    page?: number;
    size?: number;
    totalPages?: number;
    pagination?: {
      page?: number;
      size?: number;
      total?: number;
      totalPages?: number;
    };
  };
  
  export type Store = {
    id: string;
    createdAt?: string;
    updatedAt?: string;
  
    name?: string;
    title?: string;
    description?: string;
  
    ownerName?: string;
    representative?: string;
    phone?: string;
    email?: string;
    website?: string;
    websiteUrl?: string;
  
    address?: string;
    province?: string;
    district?: string;
    ward?: string;
  
    logoUrl?: string;
    imageUrl?: string;
    status?: string;
  
    [key: string]: unknown;
  };
  
  export type CreateStorePayload = {
    name?: string;
    title?: string;
    description?: string;
  
    ownerName?: string;
    representative?: string;
    phone?: string;
    email?: string;
    website?: string;
    websiteUrl?: string;
  
    address?: string;
    province?: string;
    district?: string;
    ward?: string;
  
    logoUrl?: string;
    imageUrl?: string;
    status?: string;
  
    [key: string]: unknown;
  };
  
  export type UpdateStorePayload = Partial<CreateStorePayload>;
  
  const API_URL = "https://be.government.kidoedu.vn";const RESOURCE = "stores";
  
  if (!API_URL) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_API_URL hoặc NEXT_PUBLIC_API_BASE_URL. Hãy kiểm tra file .env.local và khởi động lại FE.",
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
  
  function buildQueryString(query?: StoreQuery): string {
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
  
  function normalizeListResponse<T>(value: unknown): T[] {
    const unwrapped = unwrapApiResponse<unknown>(value as ApiResponse<unknown>);
  
    if (Array.isArray(unwrapped)) {
      return unwrapped as T[];
    }
  
    if (typeof unwrapped === "object" && unwrapped !== null) {
      const body = unwrapped as PaginatedResponse<T>;
  
      const items = body.items ?? body.stores ?? body.data ?? [];
  
      return Array.isArray(items) ? items : [];
    }
  
    return [];
  }
  
  function normalizeSingleResponse<T>(value: unknown): T {
    const unwrapped = unwrapApiResponse<unknown>(value as ApiResponse<unknown>);
  
    if (
      typeof unwrapped === "object" &&
      unwrapped !== null &&
      !Array.isArray(unwrapped)
    ) {
      return unwrapped as T;
    }
  
    return {} as T;
  }
  
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, options);
  
    return handleResponse<T>(response);
  }
  
  // GET /stores
  export async function getStores(query?: StoreQuery): Promise<Store[]> {
    const queryString = buildQueryString(query);
  
    const data = await request<unknown>(`/${RESOURCE}${queryString}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse<Store>(data);
  }
  
  // GET /stores/:id
  export async function getStoreById(id: string | number): Promise<Store> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeSingleResponse<Store>(data);
  }
  
  // POST /stores
  export async function createStore(
    payload: CreateStorePayload,
  ): Promise<Store> {
    const data = await request<unknown>(`/${RESOURCE}`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<Store>(data);
  }
  
  // PATCH /stores/:id
  export async function updateStore(
    id: string | number,
    payload: UpdateStorePayload,
  ): Promise<Store> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<Store>(data);
  }
  
  // DELETE /stores/:id
  export async function deleteStore(id: string | number): Promise<void> {
    await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  }
