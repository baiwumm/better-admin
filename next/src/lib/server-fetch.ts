import "server-only";

import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import {
  API_BASE,
  ApiClientError,
  getErrorMessageShared,
  parseEnvelope,
} from "@/lib/api-shared";

/**
 * 服务端请求封装（serverFetch）。
 *
 * 职责（与修订方案 §架构要点 3 一致）：
 * - 从 httpOnly Cookie 读取 access token（next/headers，仅服务端可读）；
 * - 自动附加 `Authorization: Bearer {token}` 头后发起请求——内部 API
 *   处理逻辑仍按契约使用 Bearer 头解析，与 React 端完全一致，仅存储层有差异；
 * - 解析统一信封 `{ data }` / `{ data, pagination }`，错误抛 ApiClientError。
 *
 * 服务端不做 401 自动刷新：RSC 的会话有效性由 middleware（N1）统一守卫，
 * 失效时直接 redirect /sign-in，无需在数据层重试。
 */

/** 服务端从 Cookie 读取的 access token（缺省返回 null）。 */
export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/** 服务端读取的 refresh token（供 /auth/refresh 等内部逻辑使用，缺省返回 null）。 */
export async function getServerRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

/** 双令牌写入参数（N1 认证期由 /api/auth/* 使用）。 */
export interface AuthCookiePayload {
  accessToken: string;
  refreshToken?: string | null;
}

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

export interface ServerRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** 是否需要鉴权（默认 true：自动附 Bearer 头） */
  auth?: boolean;
}

/** 发起一次服务端 API 请求并返回完整信封 `{ data, pagination? }`。 */
export async function serverFetchRaw(
  path: string,
  options: ServerRequestOptions = {},
): Promise<{ data: unknown; pagination?: unknown }> {
  const { method = "GET", headers, body, auth = true } = options;

  const requestHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const token = await getServerAccessToken();

    if (token) requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const finalBody =
    body === undefined || body instanceof FormData
      ? body
      : JSON.stringify(body);

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: finalBody as BodyInit | undefined,
  });

  if (response.status === 204) {
    return { data: null };
  }

  const text = await response.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const err = (json ?? {}) as { code?: string; message?: string };

    throw new ApiClientError(
      response.status,
      err.code,
      err.message ??
        getErrorMessageShared(
          "errors.api.requestFailed",
          "请求失败（{{status}}）",
          { status: response.status },
        ),
    );
  }

  return parseEnvelope(json);
}

/** serverFetch：返回信封内的 `data`。 */
export async function serverFetch<T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  const envelope = await serverFetchRaw(path, options);

  return envelope.data as T;
}
