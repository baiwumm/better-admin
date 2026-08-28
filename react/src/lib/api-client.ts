import type { ApiListEnvelope, ListQueryParams } from "@/lib/api-types";

import { ENV } from "@/lib/env";
import { getErrorMessage } from "@/i18n";

/**
 * 统一 API 客户端（fetch 封装）。
 *
 * 职责：
 * - 自动附带 `Authorization: Bearer <accessToken>`（从 auth-store 读取）。
 * - 解析后端统一响应信封 `{ data }` / `{ data, pagination }`；
 *   错误响应 `{ code, message }` 抛出 ApiClientError。
 * - 遇到 401（accessToken 过期）：触发 refresh 流程（POST /auth/refresh，
 *   refreshToken 放 body），刷新成功后**用新 token 重试原请求一次**。
 * - refresh 并发去重：多个请求同时 401 时，只发一次 refresh，其余共享同一 Promise。
 * - refresh 失败（refreshToken 也过期）：清空本地会话并跳转登录页。
 *
 * 注意：本文件不直接 import auth-store 的 React hook（避免循环依赖与渲染期副作用），
 * 仅通过 `getAuthSnapshot()` 读取/写入 token，与 store 解耦。
 */

/** 从 auth-store 暴露的最小读写接口（避免循环 import）。 */
export interface AuthSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => void;
  clearSession: () => void;
}

let authSnapshot: AuthSnapshot | null = null;

/** 由 auth-store 初始化时注入，供 api-client 读写 token。 */
export function bindAuthSnapshot(snapshot: AuthSnapshot) {
  authSnapshot = snapshot;
}

/** 后端错误响应结构。 */
export interface ApiErrorBody {
  code?: string;
  message?: string;
}

/** 统一抛出的 API 错误（携带 HTTP 状态与后端 code/message）。 */
export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

/** 当前是否处于「未登录/会话失效」状态（用于避免重复跳转）。 */
let redirectingToSignIn = false;

function redirectToSignIn() {
  if (redirectingToSignIn) return;
  redirectingToSignIn = true;
  // 直接整页跳转登录页（清空 SPA 内存态更干净）；
  // 登录页 beforeLoad 会处理已登录态，这里必定未登录。
  window.location.assign("/sign-in");
}

/** refresh 请求的并发去重 Promise（同一时刻只存在一个飞行中的 refresh）。 */
let refreshPromise: Promise<string> | null = null;

/**
 * 执行一次 token 刷新（带并发去重）。
 * 成功返回新的 accessToken；失败抛错并清空会话。
 */
async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const snapshot = authSnapshot;
    const refreshToken = snapshot?.refreshToken ?? null;

    if (!snapshot || !refreshToken) {
      snapshot?.clearSession();
      throw new ApiClientError(
        401,
        "NO_REFRESH_TOKEN",
        getErrorMessage("errors.api.sessionExpired", "会话已失效，请重新登录"),
      );
    }

    const res = await fetch(`${ENV.apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      snapshot.clearSession();
      throw new ApiClientError(
        res.status,
        "REFRESH_FAILED",
        getErrorMessage("errors.api.loginExpired", "登录已过期，请重新登录"),
      );
    }

    const body = (await res.json()) as {
      data?: { accessToken?: string; refreshToken?: string };
    };
    const newAccessToken = body.data?.accessToken;
    // 契约 v1.2：refreshToken 轮换后端会下发新 token，必须写回内存/持久化
    const newRefreshToken = body.data?.refreshToken ?? null;

    if (!newAccessToken) {
      snapshot.clearSession();
      throw new ApiClientError(
        401,
        "REFRESH_NO_TOKEN",
        getErrorMessage("errors.api.refreshFailed", "刷新失败，请重新登录"),
      );
    }

    snapshot.setTokens({
      accessToken: newAccessToken,
      // 后端未下发新 refreshToken 时保持原值（setTokens 对 undefined 不覆盖）
      ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
    });

    return newAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    // 无论成功失败都释放去重锁，让下一次请求可以重新尝试
    refreshPromise = null;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** 请求体（对象会被 JSON 序列化；FormData 等原样透传） */
  body?: unknown;
  /** 是否需要鉴权（默认 true；登录/刷新等接口设 false 避免死循环） */
  auth?: boolean;
  /** 是否允许 401 自动刷新并重试（默认 true） */
  allowRetry?: boolean;
}

/**
 * 发起一次 API 请求，返回信封内的 `data`（或含 pagination 的整个信封）。
 * 泛型 R 描述 `data` 的类型；如需 pagination 请使用 fetchApiRaw。
 */
export async function fetchApi<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const envelope = await fetchApiRaw(path, options);

  return envelope.data as T;
}

/** 发起请求并返回完整信封 `{ data, pagination? }`。 */
export async function fetchApiRaw(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: unknown; pagination?: unknown }> {
  const { body, auth = true, allowRetry = true, headers, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = authSnapshot?.accessToken ?? null;

    if (token) requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const finalBody =
    body === undefined || body instanceof FormData
      ? body
      : JSON.stringify(body);

  const response = await fetch(`${ENV.apiBaseUrl}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: finalBody as BodyInit | undefined,
  });

  // 401：尝试刷新 token 并重试一次（避免无限递归：重试请求 allowRetry=false）
  if (response.status === 401 && auth && allowRetry) {
    try {
      await refreshAccessToken();
    } catch {
      redirectToSignIn();
      throw new ApiClientError(
        401,
        "UNAUTHORIZED",
        getErrorMessage("errors.api.loginExpired", "登录已过期，请重新登录"),
      );
    }

    return fetchApiRaw(path, { ...options, allowRetry: false });
  }

  if (response.status === 204) {
    // 无内容响应（如 logout）
    return { data: null };
  }

  const text = await response.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const err = (json ?? {}) as ApiErrorBody;

    throw new ApiClientError(
      response.status,
      err.code,
      err.message ??
        getErrorMessage("errors.api.requestFailed", "请求失败（{{status}}）", {
          status: response.status,
        }),
    );
  }

  // 信封约定：{ data } 或 { data, pagination }
  if (json && typeof json === "object" && "data" in json) {
    return json as { data: unknown; pagination?: unknown };
  }

  // 非信封结构（兜底）
  return { data: json };
}

/** 将查询参数对象序列化为 query string（跳过 undefined / null / 空字符串）。 */
export function buildQueryString(params: ListQueryParams): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const qs = search.toString();

  return qs ? `?${qs}` : "";
}

/**
 * 列表请求封装：返回强类型的 `{ data, pagination }` 信封。
 * 后端所有列表接口统一走 `{data, pagination:{page,pageSize,total}}` 结构。
 */
export async function fetchApiList<T>(
  path: string,
  params: ListQueryParams = {},
  options: RequestOptions = {},
): Promise<ApiListEnvelope<T>> {
  const envelope = await fetchApiRaw(
    `${path}${buildQueryString(params)}`,
    options,
  );

  return envelope as ApiListEnvelope<T>;
}
