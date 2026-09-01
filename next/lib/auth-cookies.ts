/**
 * 双令牌 Cookie 常量（httpOnly + Secure + SameSite=Lax，N1 认证期写入）。
 *
 * 存储层与 React 版（localStorage + Bearer）不同，但鉴权语义与契约一致：
 * 服务端鉴权工具优先解析 Authorization: Bearer，回退读这里的 access Cookie。
 * 该文件被服务端（Route Handler / middleware）引用；Cookie 为 httpOnly，
 * 客户端不读取，故不含客户端逻辑。
 */

export const ACCESS_TOKEN_COOKIE = "ba_access_token";
export const REFRESH_TOKEN_COOKIE = "ba_refresh_token";
