/**
 * 环境变量校验与归一化——密钥与令牌有效期的唯一取值源。
 *
 * 存在理由：此前 auth 模块 / jwt 策略 / auth.service 三处各自 `process.env.X ?? 默认值`，
 * 同一个 JWT_EXPIRES_IN 在不同位置兜底成 '7d' 与 '1h' 两个值，且 JWT_SECRET 带着
 * 仓库内明文兜底串——一旦有入口绕过启动校验（脚本、测试、调整 main.ts 顺序）就会
 * 静默用可预测密钥签发令牌。故密钥一律 fail-fast（与 Next / Nuxt 端同口径），
 * 有效期默认值只在本文件留一份。
 *
 * 必需：
 *   - DATABASE_URL：PostgreSQL 连接串（仅服务端，严禁提交/暴露前端）
 *   - JWT_SECRET：JWT 签名密钥（无默认值，缺失即拒绝启动）
 *
 * 可选（带默认值）：
 *   - JWT_EXPIRES_IN：access token 有效期（默认 1h，与 .env.example 一致）
 *   - REFRESH_EXPIRES_IN / REFRESH_EXPIRES_IN_SHORT：refresh token 长/短档（默认 30d / 1d）
 *   - JWT_REFRESH_SECRET：refresh token 专用密钥（未设置时回退 JWT_SECRET）
 */

/** access token 默认有效期（与 .env.example 与 auth.service 原实际生效值一致） */
export const DEFAULT_JWT_EXPIRES_IN = '1h';
/** refresh token「记住我」档默认有效期 */
export const DEFAULT_REFRESH_EXPIRES_IN = '30d';
/** refresh token 非记住我档默认有效期 */
export const DEFAULT_REFRESH_EXPIRES_IN_SHORT = '1d';

/**
 * 读取环境变量并把空串 / 纯空白归一为「未设置」。
 *
 * 必须这样处理：`process.env.X ?? fallback` 对空串不回退（`'' ?? v` 仍是 ''），
 * 而 .env.example 里 `JWT_REFRESH_SECRET=` 正是空值写法——按模板配置就会把空串
 * 当密钥传给 jsonwebtoken。
 */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshExpiresIn: string;
  refreshExpiresInShort: string;
  refreshSecret: string;
}

/** JWT_SECRET：无兜底值，缺失或为空即抛错（禁止回退到仓库内明文密钥）。 */
export function getJwtSecret(): string {
  const secret = readEnv('JWT_SECRET');
  if (!secret) {
    throw new Error(
      '[config] 环境变量 JWT_SECRET 未设置或为空，无法签发/校验令牌（请配置强随机密钥）',
    );
  }
  return secret;
}

/** access token 有效期。 */
export function getJwtExpiresIn(): string {
  return readEnv('JWT_EXPIRES_IN') ?? DEFAULT_JWT_EXPIRES_IN;
}

/** refresh token 专用密钥；未显式配置时回退 JWT_SECRET。 */
export function getRefreshSecret(): string {
  return readEnv('JWT_REFRESH_SECRET') ?? getJwtSecret();
}

/** refresh token 有效期，按「记住我」分长/短两档。 */
export function getRefreshExpiresIn(rememberMe: boolean): string {
  return (
    readEnv(rememberMe ? 'REFRESH_EXPIRES_IN' : 'REFRESH_EXPIRES_IN_SHORT') ??
    (rememberMe ? DEFAULT_REFRESH_EXPIRES_IN : DEFAULT_REFRESH_EXPIRES_IN_SHORT)
  );
}

/**
 * 启动期校验入口：在应用启动最早期调用，缺失关键变量时显式抛出清晰错误。
 * 返回归一化后的完整配置，便于诊断与后续复用。
 */
export function loadConfig(): AppConfig {
  const databaseUrl = readEnv('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error(
      '[config] 环境变量 DATABASE_URL 未设置，无法启动（格式：postgresql://user:pass@host:5432/db?sslmode=require）',
    );
  }

  const jwtSecret = getJwtSecret();

  return {
    databaseUrl,
    jwtSecret,
    jwtExpiresIn: getJwtExpiresIn(),
    refreshExpiresIn: getRefreshExpiresIn(true),
    refreshExpiresInShort: getRefreshExpiresIn(false),
    refreshSecret: getRefreshSecret(),
  };
}
