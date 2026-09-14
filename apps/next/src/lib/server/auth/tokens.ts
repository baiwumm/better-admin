import "server-only";

import { SignJWT, jwtVerify, decodeJwt } from "jose";

/**
 * JWT 双令牌签发/校验（jose，与 Nest 端 jsonwebtoken 语义对齐）。
 *
 * 与 Nest 端的差异仅在实现库：
 * - Nest 用 passport-jwt + @nestjs/jwt；Next 用 jose（同为 HS256）；
 * - payload 结构与 claim 语义完全一致：sub / username / type / ver
 *   （ver = 签发时的 users.token_version，改密码/封禁后旧链路全端失效）；
 * - refresh 使用独立 JWT_REFRESH_SECRET，access 使用 JWT_SECRET。
 */

export interface AuthJwtPayload {
  sub: string;
  username: string;
  type?: "access" | "refresh";
  /** 签发时的用户 tokenVersion，与 users.token_version 比对实现全端撤销 */
  ver?: number;
}

const TOKEN_ENCODER = new TextEncoder();

/** access / refresh 各自的签名密钥（refresh 缺省回退 JWT_SECRET，对齐 Nest 端）。 */
function tokenSecret(kind: "access" | "refresh"): Uint8Array {
  // 空串视为未设置：nest/.env 中 JWT_REFRESH_SECRET 可留空，实际应回退
  // JWT_SECRET——`??` 不会跳过空串，必须用 trim + || 显式回退
  const raw =
    kind === "refresh"
      ? process.env.JWT_REFRESH_SECRET?.trim() || process.env.JWT_SECRET
      : process.env.JWT_SECRET;
  const value = raw?.trim() ? raw : undefined;

  if (kind === "refresh" && !value) {
    throw new Error(
      "JWT_REFRESH_SECRET（或 JWT_SECRET）环境变量未设置，无法签发/校验 refresh 令牌。",
    );
  }

  if (!value) {
    throw new Error("JWT_SECRET 环境变量未设置，无法签发/校验 access 令牌。");
  }

  return TOKEN_ENCODER.encode(value);
}

/**
 * 签发一个 JWT（HS256）。
 * expiresIn 支持 jsonwebtoken 同款时长字符串（"1h" / "30d"）或秒数。
 */
export async function signToken(
  payload: AuthJwtPayload & { type: "access" | "refresh" },
  expiresIn: string | number,
): Promise<string> {
  const builder = new SignJWT({
    username: payload.username,
    type: payload.type,
    ver: payload.ver,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn);

  return builder.sign(tokenSecret(payload.type));
}

/** 校验并解出 JWT 载荷（验签失败/过期均抛错，由调用方转为 401 或静默失败）。 */
export async function verifyToken(
  token: string,
  kind: "access" | "refresh",
): Promise<AuthJwtPayload> {
  const { payload } = await jwtVerify(token, tokenSecret(kind));

  // 自签令牌的载荷必含 sub/username/type/ver；jose 的 JWTPayload 将自定义
  // claim 建为可选索引签名，这里经 unknown 收窄
  return payload as unknown as AuthJwtPayload;
}

/** 无验签解码（仅用于读取刚签发令牌的 exp 以设置 Cookie maxAge）。 */
export function decodeTokenExp(token: string): number | null {
  const payload = decodeJwt(token);

  return typeof payload.exp === "number" ? payload.exp : null;
}
