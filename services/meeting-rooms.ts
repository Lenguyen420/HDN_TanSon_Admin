import { ensureStoredAdminToken } from "@/services/auth.service";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type MeetingRoomQuery = {
  page?: number;
  size?: number;
  keyword?: string;
};

export type PaginatedResponse<T> = {
  data?: T[];
  items?: T[];
  rooms?: T[];
  meetingRooms?: T[];
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

export type MeetingRoom = {
  id: string;
  createdAt?: string;
  updatedAt?: string;

  name?: string;
  code?: string;
  status?: string;
  description?: string;
  note?: string;

  location?: string;
  address?: string;
  building?: string;
  floor?: string | number;

  capacity?: number | string;
  seats?: number | string;

  managerName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;

  imageUrl?: string;
  equipment?: string[] | string;
  devices?: Array<{
    id?: string;
    name?: string;
    status?: string;
    [key: string]: unknown;
  }>;

  isActive?: boolean;

  [key: string]: unknown;
};

export type CreateMeetingRoomPayload = {
  name?: string;
  code?: string;
  status?: string;
  description?: string;
  note?: string;

  location?: string;
  building?: string;
  floor?: string | number;

  capacity?: number | string;

  managerName?: string;
  phone?: string;
  email?: string;

  imageUrl?: string;
  equipment?: string[];

  [key: string]: unknown;
};

export type UpdateMeetingRoomPayload = Partial<CreateMeetingRoomPayload>;

const API_URL = "https://be.government.kidoedu.vn";const RESOURCE = "meeting-rooms";

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

function buildQueryString(query?: MeetingRoomQuery): string {
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

function normalizeListResponse(value: unknown): MeetingRoom[] {
  const unwrapped = unwrapApiResponse<unknown>(value as ApiResponse<unknown>);

  if (Array.isArray(unwrapped)) {
    return unwrapped as MeetingRoom[];
  }

  if (typeof unwrapped === "object" && unwrapped !== null) {
    const body = unwrapped as PaginatedResponse<MeetingRoom>;

    const items =
      body.items ?? body.rooms ?? body.meetingRooms ?? body.data ?? [];

    return Array.isArray(items) ? items : [];
  }

  return [];
}

function normalizeSingleResponse(value: unknown): MeetingRoom {
  const unwrapped = unwrapApiResponse<unknown>(value as ApiResponse<unknown>);

  if (
    typeof unwrapped === "object" &&
    unwrapped !== null &&
    !Array.isArray(unwrapped)
  ) {
    return unwrapped as MeetingRoom;
  }

  return {} as MeetingRoom;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);

  return handleResponse<T>(response);
}

// GET /meeting-rooms
export async function getMeetingRooms(
  query?: MeetingRoomQuery,
): Promise<MeetingRoom[]> {
  const queryString = buildQueryString(query);

  const data = await request<unknown>(`/${RESOURCE}${queryString}`, {
    method: "GET",
    headers: await getHeaders(),
    cache: "no-store",
  });

  return normalizeListResponse(data);
}

// GET /meeting-rooms/:id
export async function getMeetingRoomById(
  id: string | number,
): Promise<MeetingRoom> {
  const data = await request<unknown>(`/${RESOURCE}/${id}`, {
    method: "GET",
    headers: await getHeaders(),
    cache: "no-store",
  });

  return normalizeSingleResponse(data);
}

// POST /meeting-rooms
export async function createMeetingRoom(
  payload: CreateMeetingRoomPayload,
): Promise<MeetingRoom> {
  const data = await request<unknown>(`/${RESOURCE}`, {
    method: "POST",
    headers: await getHeaders(true),
    body: JSON.stringify(payload),
  });

  return normalizeSingleResponse(data);
}

// PATCH /meeting-rooms/:id
export async function updateMeetingRoom(
  id: string | number,
  payload: UpdateMeetingRoomPayload,
): Promise<MeetingRoom> {
  const data = await request<unknown>(`/${RESOURCE}/${id}`, {
    method: "PATCH",
    headers: await getHeaders(true),
    body: JSON.stringify(payload),
  });

  return normalizeSingleResponse(data);
}

// PATCH /meeting-rooms/:id (chỉ đổi trạng thái)
export async function updateMeetingRoomStatus(
  id: string | number,
  status: string,
): Promise<MeetingRoom> {
  return updateMeetingRoom(id, { status });
}
