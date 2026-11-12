import assert from "node:assert/strict";
import test from "node:test";
import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import axiosInstance from "../services/api/axiosConfig.ts";
import { authApi } from "../services/api/authApi.ts";
import { memberApi } from "../services/api/memberApi.ts";
import { registrationApi } from "../services/api/registrationApi.ts";
import { ApiError } from "../services/api/apiError.ts";

function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
) {
  return {
    config,
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders(),
  };
}
function reject(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
  retryAfter?: string,
): never {
  const result = response(config, data, status);
  if (retryAfter) result.headers.set("retry-after", retryAfter);
  throw new AxiosError(
    "Request failed",
    "ERR_BAD_RESPONSE",
    config,
    undefined,
    result,
  );
}

test("concurrent 401 requests share one refresh and retry with original payload", async () => {
  let release!: () => void;
  let failuresReady!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const firstFailures = new Promise<void>((resolve) => {
    failuresReady = resolve;
  });
  let failures = 0;
  let refreshes = 0;
  const attempts = new Map<string, number>();
  axiosInstance.defaults.adapter = async (config) => {
    if (config.url === "/auth/refresh") {
      refreshes++;
      await gate;
      return response(config, { data: { expiresIn: 900 } });
    }
    const url = config.url!;
    const count = (attempts.get(url) ?? 0) + 1;
    attempts.set(url, count);
    if (count === 1) {
      if (++failures === 2) failuresReady();
      reject(config, 401, { message: "Expired" });
    }
    if (url.endsWith("/reject")) {
      assert.deepEqual(JSON.parse(config.data), {
        reason: "Cần bổ sung hồ sơ",
      });
      return response(config, { data: { id: "r1", status: "rejected" } });
    }
    return response(config, {
      data: [],
      pagination: { total: 0, page: 1, limit: 100 },
    });
  };
  const pending = Promise.all([
    memberApi.getAll({ page: 1, limit: 100 }),
    registrationApi.reject("r1", "Cần bổ sung hồ sơ"),
  ]);
  await firstFailures;
  release();
  await pending;
  assert.equal(refreshes, 1);
  assert.deepEqual([...attempts.values()], [2, 2]);
});

test("failed refresh rejects original request without a refresh loop", async () => {
  const urls: string[] = [];
  axiosInstance.defaults.adapter = async (config) => {
    urls.push(config.url!);
    reject(config, 401, { message: "Phiên đã hết hạn" });
  };
  await assert.rejects(
    memberApi.getAll(),
    (error: unknown) => error instanceof ApiError && error.statusCode === 401,
  );
  assert.deepEqual(urls, ["/association/members", "/auth/refresh"]);
});

test("a second 401 after refresh stops after one retry", async () => {
  let refreshes = 0;
  let requests = 0;
  axiosInstance.defaults.adapter = async (config) => {
    if (config.url === "/auth/refresh") {
      refreshes++;
      return response(config, { data: {} });
    }
    requests++;
    reject(config, 401, { message: "Unauthorized" });
  };
  await assert.rejects(authApi.getMe(), ApiError);
  assert.equal(refreshes, 1);
  assert.equal(requests, 2);
});

test("login keeps password unchanged and exposes rate-limit retry time", async () => {
  let calls = 0;
  axiosInstance.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, "/auth/admin-login");
    assert.equal(JSON.parse(config.data).password, "  secret  ");
    reject(
      config,
      429,
      { message: ["Thử lại sau", "Quá nhiều yêu cầu"] },
      "30",
    );
  };
  await assert.rejects(
    authApi.login({ username: "admin", password: "  secret  " }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 429 &&
      error.retryAfter === 30 &&
      error.message === "Thử lại sau, Quá nhiều yêu cầu",
  );
  assert.equal(calls, 1);
});

test("incorrect credentials do not trigger refresh", async () => {
  let calls = 0;
  axiosInstance.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, "/auth/admin-login");
    reject(config, 401, { message: "Sai tài khoản hoặc mật khẩu" });
  };
  await assert.rejects(
    authApi.login({ username: "admin", password: "wrong" }),
    ApiError,
  );
  assert.equal(calls, 1);
});

test("updates retain empty values and false so existing fields can be cleared", async () => {
  axiosInstance.defaults.adapter = async (config) => {
    assert.equal(config.baseURL, "/api");
    assert.equal(config.withCredentials, true);
    assert.equal(config.headers.has("Authorization"), false);
    assert.deepEqual(JSON.parse(config.data), { email: "", isBoard: false });
    return response(config, { data: { id: "m1", email: "", isBoard: false } });
  };
  const member = await memberApi.update("m1", { email: "", isBoard: false });
  assert.equal(member.email, "");
});

test("network and timeout failures have readable messages", async () => {
  axiosInstance.defaults.adapter = async (config) => {
    throw new AxiosError("Network Error", "ERR_NETWORK", config);
  };
  await assert.rejects(
    memberApi.getAll(),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 0 &&
      error.message.includes("Không kết nối"),
  );
  axiosInstance.defaults.adapter = async (config) => {
    throw new AxiosError("timeout", "ECONNABORTED", config);
  };
  await assert.rejects(memberApi.getAll(), /phản hồi quá lâu/);
});
