export class ApiError extends Error {
  statusCode: number;
  retryAfter?: number;

  constructor(statusCode: number, message: string, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
