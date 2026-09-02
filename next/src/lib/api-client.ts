import type { ApiListEnvelope, ListQueryParams } from "@/lib/api-types";

import {
  API_BASE,
  ApiClientError,
  parseEnvelope,
  type ApiErrorBody,
} from "@/lib/api-shared";
import { getErrorMessage } from "@/i18n/config";
import { progressStart, progressStop } from "@/lib/progress";

// 转发共享基座导出：业务模块沿用 React 版的导入习惯（from "@/lib/api-client"）
export { API_BASE, ApiClientError, parseEnvelope, type ApiErrorBody };

/**
 * 统一 API 客户端（fetch 封装，Next 同源版）。
 *
 * 与 React 版（对接 NestJS）的差异仅在鉴权载体：
 * - API 为同源 `/api`（Next Route Handler），不再需要跨域 baseURL；
 * - 双令牌存于 httpOnly Cookie，浏览器自动携带（credentials: "include"），
 *   客户端无法（也不需要）自行组装 Authorization 头；
 * - 服务端鉴权采用双源提取：优先解析 Authorization: Bearer（契约兼容），
 *   回退读 Cookie（见 lib/server-fetch.ts 与服务端鉴权工具）。
 *
 * 共同职责保持不变（基座见 lib/api-shared.ts）：
 * - 解析后端统一响应信封 `{ data }` / `{ data, pagination }`；
 *   错误响应 `{ code, message }` 抛出 ApiClientError。
 * - 遇到 401（accessToken 过期）：触发 refresh 流程（POST /auth/refresh，
 *   刷新令牌经 Cookie 传递，服务端轮换后重写 Cookie），成功后重试原请求一次。
 * - refresh 并发去重：多个请求同时 401 时，只发一次 refresh，其余共享同一 Promise。
 * - refresh 失败：跳转登录页。
 */

/** 当前是否处于「未登录/会话失效」状态（用于避免重复跳转）。 */
let redirectingToSignIn = false;

function redirectToSignIn() {
  if (redirectingToSignIn) return;
  redirectingToSignIn = true;
  // 直接整页跳转登录页（清空客户端内存态更干净）
  window.location.assign("/sign-in");
}

/** refresh 请求的并发去重 Promise（同一时刻只存在一个飞行中的 refresh）。 */
let refreshPromise: Promise<void> | null = null;

/**
 * 执行一次 token 刷新（带并发去重）。
 * 刷新令牌经 httpOnly Cookie 传递，服务端轮换后重写两个 Cookie；
 * 本函数只关心成败：失败抛错由调用方跳转登录页。
 */
async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      throw new ApiClientError(
        res.status,
        "REFRESH_FAILED",
        getErrorMessage("errors.api.loginExpired", "登录已过期，请重新登录"),
      );
    }
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

  // 进度条：仅业务请求触发（auth: false 为登录/刷新等内部请求，跳过）
  if (auth) progressStart();

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const finalBody =
    body === undefined || body instanceof FormData
      ? body
      : JSON.stringify(body);

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: requestHeaders,
    body: finalBody as BodyInit | undefined,
  });

  // 401：尝试刷新 token 并重试一次（避免无限递归：重试请求 allowRetry=false）
  if (response.status === 401 && auth && allowRetry) {
    try {
      await refreshAccessToken();
    } catch {
      progressStop();
      redirectToSignIn();
      throw new ApiClientError(
        401,
        "UNAUTHORIZED",
        getErrorMessage("errors.api.loginExpired", "登录已过期，请重新登录"),
      );
    }

    // 重试请求会递归进入 fetchApiRaw（allowRetry=false），进度条由重试请求接管
    return fetchApiRaw(path, { ...options, allowRetry: false });
  }

  if (response.status === 204) {
    // 无内容响应（如 logout）
    progressStop();
    return { data: null };
  }

  const text = await response.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const err = (json ?? {}) as ApiErrorBody;

    progressStop();
    throw new ApiClientError(
      response.status,
      err.code,
      err.message ??
        getErrorMessage("errors.api.requestFailed", "请求失败（{{status}}）", {
          status: response.status,
        }),
    );
  }

  progressStop();
  return parseEnvelope(json);
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
