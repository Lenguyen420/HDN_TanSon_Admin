// src/services/auth.service.ts

export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

export type AdminLoginPayload = {
    username: string;
    password: string;
};

export type AdminUser = {
    id?: string;
    username?: string;
    email?: string;
    name?: string;
    role?: string;

    [key: string]: unknown;
};

export type AdminLoginData = {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
    expiresIn?: number | null;
    user?: AdminUser;
    admin?: AdminUser;

    [key: string]: unknown;
};

const API_URL = "/api/auth";
const ACCESS_TOKEN_STORAGE_KEY = "admin_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "admin_refresh_token";
const EXPIRES_AT_STORAGE_KEY = "admin_access_expires_at";
const ADMIN_USER_STORAGE_KEY = "admin_user";

export class ApiError extends Error {
    statusCode: number;
    errorCode?: string;
    retryAfter?: number;

    constructor({
        message,
        statusCode,
        errorCode,
        retryAfter,
    }: {
        message: string;
        statusCode: number;
        errorCode?: string;
        retryAfter?: number;
    }) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.retryAfter = retryAfter;
    }
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}

function getHeaders(hasJsonBody = false): HeadersInit {
    const headers: Record<string, string> = {
        Accept: "application/json",
    };

    if (hasJsonBody) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();

    if (!response.ok) {
        let message = `API request failed: ${response.status}`;
        let errorCode: string | undefined;

        if (text) {
            try {
                const body = JSON.parse(text) as {
                    message?: string | string[];
                    error?: string;
                    statusCode?: number;
                };

                if (Array.isArray(body.message)) {
                    message = body.message.join(", ");
                } else {
                    message = body.message ?? body.error ?? message;
                }

                errorCode = body.error;
            } catch {
                message = text;
            }
        }

        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = retryAfterHeader
            ? Number.parseInt(retryAfterHeader, 10)
            : undefined;

        throw new ApiError({
            message,
            statusCode: response.status,
            errorCode,
            retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
        });
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

async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, options);

    return handleResponse<T>(response);
}

export async function adminLogin(
    payload: AdminLoginPayload,
): Promise<AdminLoginData> {
    const data = await request<unknown>("/admin-login", {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
        cache: "no-store",
        credentials: "same-origin",
    });

    return unwrapApiResponse<AdminLoginData>(data as ApiResponse<AdminLoginData>);
}

export function getAdminToken(data: AdminLoginData): string {
    return String(data.accessToken ?? data.token ?? "");
}

export function getStoredAdminToken(): string {
    if (typeof window === "undefined") {
        return "";
    }

    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? "";
}

export function getStoredRefreshToken(): string {
    if (typeof window === "undefined") {
        return "";
    }

    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? "";
}

export function getStoredAdminUser(): AdminUser | null {
    if (typeof window === "undefined") {
        return null;
    }

    const rawUser = window.localStorage.getItem(ADMIN_USER_STORAGE_KEY);

    if (!rawUser) {
        return null;
    }

    try {
        return JSON.parse(rawUser) as AdminUser;
    } catch {
        window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
        return null;
    }
}

export function getAdminSystemRole(user?: AdminUser | null): string {
    const role = user?.systemRole ?? user?.role;

    return typeof role === "string" ? role.toUpperCase() : "USER";
}

let refreshTokenPromise: Promise<string> | null = null;

export async function ensureStoredAdminToken(): Promise<string> {
    const existingToken = getStoredAdminToken();

    if (existingToken) {
        return existingToken;
    }

    if (!refreshTokenPromise) {
        refreshTokenPromise = fetch(`${API_URL}/refresh`, {
            method: "POST",
            headers: getHeaders(),
            cache: "no-store",
            credentials: "same-origin",
        })
            .then(async (response) => {
                const data = await handleResponse<unknown>(response);
                const authData = unwrapApiResponse<AdminLoginData>(
                    data as ApiResponse<AdminLoginData>,
                );

                rememberAdminAuth(authData);

                return getAdminToken(authData);
            })
            .catch((error) => {
                clearAdminAuth();

                if (
                    typeof window !== "undefined" &&
                    window.location.pathname !== "/login"
                ) {
                    window.location.assign("/login");
                }

                throw error;
            })
            .finally(() => {
                refreshTokenPromise = null;
            });
    }

    return refreshTokenPromise;
}

export function rememberAdminAuth(data: AdminLoginData) {
    if (typeof window === "undefined") {
        return;
    }

    const accessToken = getAdminToken(data);
    const refreshToken = data.refreshToken ? String(data.refreshToken) : "";

    if (accessToken) {
        window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    }

    if (refreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }

    if (typeof data.expiresIn === "number" && Number.isFinite(data.expiresIn)) {
        window.localStorage.setItem(
            EXPIRES_AT_STORAGE_KEY,
            String(Date.now() + data.expiresIn * 1000),
        );
    }

    const user = data.user ?? data.admin;

    if (user) {
        window.localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
    }
}

export function clearAdminAuth() {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
}
