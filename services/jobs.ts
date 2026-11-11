import { ensureStoredAdminToken } from "@/services/auth.service";

export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
  };
  
  export type AdminRecord = Record<string, unknown>;
  
  export type JobQuery = {
    page?: number;
    size?: number;
    limit?: number;
    search?: string;
    keyword?: string;
    zoneId?: string;
    location?: string;
    area?: string;
    workType?: string;
    employmentType?: string;
  
    [key: string]: string | number | boolean | undefined;
  };
  
  export type PaginatedResponse<T> = {
    data?: T[];
    items?: T[];
    jobs?: T[];
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
  
  export type Job = {
    id: string;
    createdAt?: string;
    updatedAt?: string;
  
    title?: string;
    zoneId?: string;
    zone?: {
      id?: string;
      name?: string;
      [key: string]: unknown;
    };
    companyName?: string;
    company?: string;
    description?: string;
    jobDescription?: string;
    requirement?: string;
    requirements?: string;
    benefit?: string;
    benefits?: string;
    salary?: string;
    location?: string;
    area?: string;
    workType?: string;
    employmentType?: string;
    deadline?: string;
    status?: string;
    views?: number;
    likes?: number;
  
    [key: string]: unknown;
  };
  
  export type CreateJobPayload = {
    title?: string;
    zoneId?: string;
    companyName?: string;
    company?: string;
    description?: string;
    jobDescription?: string;
    requirement?: string;
    requirements?: string;
    benefit?: string;
    benefits?: string;
    salary?: string;
    location?: string;
    area?: string;
    workType?: string;
    employmentType?: string;
    deadline?: string;
    status?: string;
    views?: number;
  
    [key: string]: unknown;
  };
  
  export type UpdateJobPayload = Partial<CreateJobPayload>;
  
  export type JobViewPayload = {
    userId?: string;
    zaloUserId?: string;
  
    [key: string]: unknown;
  };
  
  export type UpdateJobLikePayload = {
    userId?: string;
    zaloUserId?: string;
    liked?: boolean;
    isLiked?: boolean;
  
    [key: string]: unknown;
  };
  
  export type JobInteraction = {
    id?: string;
    userId?: string;
    jobId?: string;
    liked?: boolean;
    isLiked?: boolean;
    viewed?: boolean;
    viewCount?: number;
    createdAt?: string;
    updatedAt?: string;
  
    [key: string]: unknown;
  };
  
  export type CreateJobApplicationPayload = {
    userId?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    cvUrl?: string;
    resumeUrl?: string;
    coverLetter?: string;
    note?: string;
  
    [key: string]: unknown;
  };
  
  export type JobApplication = {
    id?: string;
    jobId?: string;
    userId?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    cvUrl?: string;
    resumeUrl?: string;
    coverLetter?: string;
    note?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  
    [key: string]: unknown;
  };
  
  const API_URL = "https://be.government.kidoedu.vn";const RESOURCE = "jobs";
  
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
  
  function buildQueryString(query?: JobQuery): string {
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
  
      const items = body.items ?? body.jobs ?? body.data ?? [];
  
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
  
  // GET /jobs
  export async function getJobs(query?: JobQuery): Promise<Job[]> {
    const queryString = buildQueryString(query);
  
    const data = await request<unknown>(`/${RESOURCE}${queryString}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse<Job>(data);
  }
  
  // GET /jobs/:id
  export async function getJobById(id: string | number): Promise<Job> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeSingleResponse<Job>(data);
  }
  
  // POST /jobs
  export async function createJob(payload: CreateJobPayload): Promise<Job> {
    const data = await request<unknown>(`/${RESOURCE}`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<Job>(data);
  }
  
  // PATCH /jobs/:id
  export async function updateJob(
    id: string | number,
    payload: UpdateJobPayload,
  ): Promise<Job> {
    const data = await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<Job>(data);
  }
  
  // DELETE /jobs/:id
  export async function deleteJob(id: string | number): Promise<void> {
    await request<unknown>(`/${RESOURCE}/${id}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
  }
  
  // POST /jobs/:id/views
  export async function recordJobView(
    id: string | number,
    payload: JobViewPayload,
  ): Promise<JobInteraction> {
    const data = await request<unknown>(`/${RESOURCE}/${id}/views`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<JobInteraction>(data);
  }
  
  // PATCH /jobs/:id/like
  export async function updateJobLike(
    id: string | number,
    payload: UpdateJobLikePayload,
  ): Promise<JobInteraction> {
    const data = await request<unknown>(`/${RESOURCE}/${id}/like`, {
      method: "PATCH",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<JobInteraction>(data);
  }
  
  // GET /jobs/:id/interactions
  export async function getJobInteractions(
    id: string | number,
  ): Promise<JobInteraction[]> {
    const data = await request<unknown>(`/${RESOURCE}/${id}/interactions`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse<JobInteraction>(data);
  }
  
  // GET /jobs/:id/interactions/:userId
  export async function getJobInteractionByUser(
    id: string | number,
    userId: string | number,
  ): Promise<JobInteraction> {
    const data = await request<unknown>(
      `/${RESOURCE}/${id}/interactions/${userId}`,
      {
        method: "GET",
        headers: await getHeaders(),
        cache: "no-store",
      },
    );
  
    return normalizeSingleResponse<JobInteraction>(data);
  }
  
  // GET /jobs/:id/applications
  export async function getJobApplications(
    id: string | number,
  ): Promise<JobApplication[]> {
    const data = await request<unknown>(`/${RESOURCE}/${id}/applications`, {
      method: "GET",
      headers: await getHeaders(),
      cache: "no-store",
    });
  
    return normalizeListResponse<JobApplication>(data);
  }
  
  // POST /jobs/:id/applications
  export async function createJobApplication(
    id: string | number,
    payload: CreateJobApplicationPayload,
  ): Promise<JobApplication> {
    const data = await request<unknown>(`/${RESOURCE}/${id}/applications`, {
      method: "POST",
      headers: await getHeaders(true),
      body: JSON.stringify(payload),
    });
  
    return normalizeSingleResponse<JobApplication>(data);
  }
