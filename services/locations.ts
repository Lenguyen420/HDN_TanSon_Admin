export type LocationApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Province = {
  id: string;
  code: string;
  name: string;
};

export type Ward = {
  id: string;
  code: string;
  name: string;
  provinceCode: string;
};

const API_URL = "https://be.government.kidoedu.vn";

if (!API_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_API_URL or NEXT_PUBLIC_API_BASE_URL. Check the environment file and restart the frontend.",
  );
}

function normalizeListResponse<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "object" && value !== null && "data" in value) {
    const data = (value as LocationApiResponse<unknown>).data;

    return Array.isArray(data) ? (data as T[]) : [];
  }

  return [];
}

async function requestLocations<T>(path: string): Promise<T[]> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Location API request failed: ${response.status}`);
  }

  const data = (await response.json()) as unknown;

  return normalizeListResponse<T>(data);
}

export async function getProvinces(): Promise<Province[]> {
  return requestLocations<Province>("/provinces");
}

export async function getWards(provinceCode: string): Promise<Ward[]> {
  const params = new URLSearchParams({ provinceCode });

  return requestLocations<Ward>(`/wards?${params.toString()}`);
}
