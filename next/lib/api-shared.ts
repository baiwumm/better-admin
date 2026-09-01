import { getErrorMessage } from "@/i18n/config";

/**
 * API 客户端共享基座（浏览器与服务端共用，无任何运行环境假设）。
 *
 * 拆分原因：`fetch` 的 credentials/自动 Cookie 行为在两端不同，
 * 信封解析、错误结构、query string 序列化则完全一致——
 * lib/api-client.ts（浏览器端）与 lib/server-fetch.ts（服务端）都从本文件取用。
 */

/** API 全局前缀（与 Nest 端 openapi.yaml 的全局前缀语义一致） */
export const API_BASE = "/api";

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

/** 解析后端统一信封：`{ data }` / `{ data, pagination }`，非信封结构兜底为 `{ data: json }`。 */
export function parseEnvelope(json: unknown): {
  data: unknown;
  pagination?: unknown;
} {
  if (json && typeof json === "object" && "data" in json) {
    return json as { data: unknown; pagination?: unknown };
  }

  return { data: json };
}

/** 容错取词（见 i18n/index.ts 同名函数），供两端错误文案使用。 */
export const getErrorMessageShared = getErrorMessage;
