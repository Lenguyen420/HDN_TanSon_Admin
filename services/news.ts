import { ensureStoredAdminToken } from "@/services/auth.service";

export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
  };
  
  export type ArticleType = {
    id: string;
    title: string;
    order?: number;
    createdAt?: string;
    updatedAt?: string;
  };
  
  export type Article = {
    id: string;
    title: string;
    author?: string | null;
    desc?: string | null;
    link?: string | null;
    thumb?: string | null;
    typeId?: string | null;
    type?: ArticleType | null;
    likes: number;
    views: number;
    publishedAt: string;
    createdAt?: string;
    updatedAt?: string;
  };
  
  export type ArticleInteraction = {
    id: string;
    articleId: string;
    userId: string;
    liked?: boolean;
    viewed?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  
  export type ArticleQueryParams = {
    page?: number;
    limit?: number;
    search?: string;
    keyword?: string;
    typeId?: string;
  };
  
  export type CreateArticleTypePayload = {
    title: string;
    order?: number;
  };
  
  export type UpdateArticleTypePayload = Partial<CreateArticleTypePayload>;
  
  export type CreateArticlePayload = {
    title: string;
    author?: string;
    desc?: string;
    link?: string;
    thumb?: string;
    typeId?: string;
    publishedAt: string;
  };
  
  export type UpdateArticlePayload = Partial<CreateArticlePayload>;
  
  export type ArticleViewPayload = {
    userId?: string;
  };
  
  export type UpdateArticleLikePayload = {
    userId: string;
    liked: boolean;
  };
  
  export type PaginatedResult<T> = {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  
  const API_URL = "https://be.government.kidoedu.vn";

if (!API_URL) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_API_BASE_URL hoặc NEXT_PUBLIC_API_URL. Hãy kiểm tra .env.local và khởi động lại FE.",
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
  
  function buildQuery(params?: Record<string, string | number | undefined>) {
    if (!params) return "";
  
    const searchParams = new URLSearchParams();
  
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  
    const queryString = searchParams.toString();
  
    return queryString ? `?${queryString}` : "";
  }
  
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, options);
  
    return handleResponse<T>(response);
  }
  
  function normalizeList<T>(value: unknown): T[] {
    const unwrapped = unwrapApiResponse<unknown>(
      value as ApiResponse<unknown>,
    );
  
    if (Array.isArray(unwrapped)) {
      return unwrapped as T[];
    }
  
    if (typeof unwrapped === "object" && unwrapped !== null) {
      const body = unwrapped as {
        data?: T[];
        items?: T[];
        articles?: T[];
      };
  
      return body.items ?? body.articles ?? body.data ?? [];
    }
  
    return [];
  }
  
  function normalizeSingle<T>(value: unknown): T {
    return unwrapApiResponse<T>(value as ApiResponse<T>);
  }
  
  function normalizePagination<T>(value: unknown): PaginatedResult<T> {
    const unwrapped = unwrapApiResponse<unknown>(
      value as ApiResponse<unknown>,
    );
  
    if (Array.isArray(unwrapped)) {
      return {
        items: unwrapped as T[],
        total: unwrapped.length,
        page: 1,
        limit: unwrapped.length,
        totalPages: 1,
      };
    }
  
    const body = unwrapped as {
      data?: T[];
      items?: T[];
      articles?: T[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
      pagination?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      };
    };
  
    const items = body.items ?? body.articles ?? body.data ?? [];
    const page = body.pagination?.page ?? body.page ?? 1;
    const limit = body.pagination?.limit ?? body.limit ?? items.length;
    const total = body.pagination?.total ?? body.total ?? items.length;
    const totalPages =
      body.pagination?.totalPages ??
      body.totalPages ??
      Math.max(1, Math.ceil(total / Math.max(1, limit)));
  
    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }
  
  /* ================= ARTICLE TYPES ================= */
  
  export async function getArticleTypes(): Promise<ArticleType[]> {
    const data = await request<unknown>("/article-types", {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeList<ArticleType>(data);
  }
  
  export async function getArticleTypeById(id: string): Promise<ArticleType> {
    const data = await request<unknown>(`/article-types/${id}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeSingle<ArticleType>(data);
  }
  
  export async function createArticleType(
    payload: CreateArticleTypePayload,
  ): Promise<ArticleType> {
    const data = await request<unknown>("/article-types", {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingle<ArticleType>(data);
  }
  
  export async function updateArticleType(
    id: string,
    payload: UpdateArticleTypePayload,
  ): Promise<ArticleType> {
    const data = await request<unknown>(`/article-types/${id}`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingle<ArticleType>(data);
  }
  
  export async function deleteArticleType(id: string): Promise<void> {
    await request<unknown>(`/article-types/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  }
  
  /* ================= ARTICLES ================= */
  
  export async function getArticles(
    params?: ArticleQueryParams,
  ): Promise<PaginatedResult<Article>> {
    const query = buildQuery(params);
  
    const data = await request<unknown>(`/articles${query}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizePagination<Article>(data);
  }
  
  export async function getArticleById(id: string): Promise<Article> {
    const data = await request<unknown>(`/articles/${id}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeSingle<Article>(data);
  }
  
  export async function createArticle(
    payload: CreateArticlePayload,
  ): Promise<Article> {
    const data = await request<unknown>("/articles", {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingle<Article>(data);
  }
  
  export async function updateArticle(
    id: string,
    payload: UpdateArticlePayload,
  ): Promise<Article> {
    const data = await request<unknown>(`/articles/${id}`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingle<Article>(data);
  }
  
  export async function deleteArticle(id: string): Promise<void> {
    await request<unknown>(`/articles/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  }
  
  /* ================= ARTICLE INTERACTIONS ================= */
  
  export async function recordArticleView(
    id: string,
    payload: ArticleViewPayload = {},
  ): Promise<Article> {
    const data = await request<unknown>(`/articles/${id}/views`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingle<Article>(data);
  }
  
  export async function updateArticleLike(
    id: string,
    payload: UpdateArticleLikePayload,
  ): Promise<Article> {
    const data = await request<unknown>(`/articles/${id}/like`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingle<Article>(data);
  }
  
  export async function getArticleInteractions(
    id: string,
  ): Promise<ArticleInteraction[]> {
    const data = await request<unknown>(`/articles/${id}/interactions`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeList<ArticleInteraction>(data);
  }
  
  export async function getArticleInteractionByUser(
    articleId: string,
    userId: string,
  ): Promise<ArticleInteraction> {
    const data = await request<unknown>(
      `/articles/${articleId}/interactions/${userId}`,
      {
        method: "GET",
        headers: await getHeaders(),
        cache: "no-store",
      },
    );
  
    return normalizeSingle<ArticleInteraction>(data);
  }
