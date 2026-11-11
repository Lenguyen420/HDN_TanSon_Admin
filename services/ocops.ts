import { ensureStoredAdminToken } from "@/services/auth.service";

export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
  };
  
  export type OcopQuery = {
    page?: number;
    size?: number;
    keyword?: string;
    typeId?: string;
    type?: string;
    province?: string;
    district?: string;
    ward?: string;
    rating?: number;
  
    [key: string]: string | number | boolean | undefined;
  };
  
  export type PaginatedResponse<T> = {
    data?: T[];
    items?: T[];
    ocops?: T[];
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
  
  export type OcopType = {
    id: string;
    createdAt?: string;
    updatedAt?: string;
    group?: string;
    name?: string;
    title?: string;
    description?: string;
    order?: number;
  
    [key: string]: unknown;
  };
  
  export type Ocop = {
    id: string;
    createdAt?: string;
    updatedAt?: string;
  
    name?: string;
    title?: string;
    description?: string;
    type?: string | OcopType;
    typeId?: string;
    ocopType?: OcopType;
    star?: number | string;
    storeId?: string;
    store?: {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
      name?: string;
      address?: string;
      phone?: string;
      websiteUrl?: string;

      [key: string]: unknown;
    };
  
    ownerName?: string;
    producer?: string;
    address?: string;
    phone?: string;
    email?: string;
  
    imageUrl?: string;
    images?: string[];
    price?: number | string;
    rating?: number;
    stars?: number;
    link?: string;
  
    province?: string;
    district?: string;
    ward?: string;
  
    [key: string]: unknown;
  };
  
  export type CreateOcopPayload = {
    name?: string;
    title?: string;
    description?: string;
    type?: string;
    typeId?: string;
    star?: number | string;
    storeId?: string;
  
    ownerName?: string;
    producer?: string;
    address?: string;
    phone?: string;
    email?: string;
  
    imageUrl?: string;
    images?: string[];
    price?: number | string;
    rating?: number;
    stars?: number;
    link?: string;
  
    province?: string;
    district?: string;
    ward?: string;
  
    [key: string]: unknown;
  };
  
  export type UpdateOcopPayload = Partial<CreateOcopPayload>;
  
  export type OcopReview = {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  
    ocopId?: string;
    userId?: string;
    fullName?: string;
    phone?: string;
    rating?: number;
    stars?: number;
    content?: string;
    comment?: string;
  
    [key: string]: unknown;
  };
  
  export type CreateOcopReviewPayload = {
    userId?: string;
    fullName?: string;
    phone?: string;
    rating?: number;
    stars?: number;
    content?: string;
    comment?: string;
  
    [key: string]: unknown;
  };
  
  const API_URL = "https://be.government.kidoedu.vn";const RESOURCE = "ocops";
  
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
  
  function buildQueryString(query?: OcopQuery): string {
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
  
      const items = body.items ?? body.ocops ?? body.data ?? [];
  
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
  
  // GET /ocop-types
  export async function getOcopTypes(): Promise<OcopType[]> {
    const data = await request<unknown>("/ocop-types", {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse<OcopType>(data);
  }
  
  // GET /ocops
  export async function getOcops(query?: OcopQuery): Promise<Ocop[]> {
    const queryString = buildQueryString(query);
  
    const data = await request<unknown>(`/${RESOURCE}${queryString}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse<Ocop>(data);
  }
  
  // GET /ocops/:id
  export async function getOcopById(id: string | number): Promise<Ocop> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeSingleResponse<Ocop>(data);
  }
  
  // POST /ocops
  export async function createOcop(
    payload: CreateOcopPayload,
  ): Promise<Ocop> {
    const data = await request<unknown>(`/${RESOURCE}`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<Ocop>(data);
  }
  
  // PATCH /ocops/:id
  export async function updateOcop(
    id: string | number,
    payload: UpdateOcopPayload,
  ): Promise<Ocop> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<Ocop>(data);
  }
  
  // DELETE /ocops/:id
  export async function deleteOcop(id: string | number): Promise<void> {
    await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  }
  
  // GET /ocops/:id/reviews
  export async function getOcopReviews(
    id: string | number,
  ): Promise<OcopReview[]> {
    const data = await request<unknown>(`/${RESOURCE}/${id}/reviews`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse<OcopReview>(data);
  }
  
  // POST /ocops/:id/reviews
  export async function createOcopReview(
    id: string | number,
    payload: CreateOcopReviewPayload,
  ): Promise<OcopReview> {
    const data = await request<unknown>(`/${RESOURCE}/${id}/reviews`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<OcopReview>(data);
  }
