/**
 * 启动期环境变量校验与归一化。
 * 在应用启动最早期调用，缺失关键变量时显式抛出清晰错误。
 *
 * 必需：
 *   - DATABASE_URL：PostgreSQL 连接串（仅服务端，严禁提交/暴露前端）
 *   - JWT_SECRET：JWT 签名密钥
 *
 * 可选（带默认值）：
 *   - JWT_EXPIRES_IN：access token 有效期（默认 7d）
 *   - REFRESH_EXPIRES_IN：refresh token 有效期（默认 30d）
 *   - JWT_REFRESH_SECRET：refresh token 专用密钥（缺省回退 JWT_SECRET）
 */
export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshExpiresIn: string;
  refreshSecret: string;
}

export function loadConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!databaseUrl) {
    throw new Error(
      '[config] 环境变量 DATABASE_URL 未设置，无法启动（格式：postgresql://user:pass@host:5432/db?sslmode=require）',
    );
  }
  if (!jwtSecret) {
    throw new Error(
      '[config] 环境变量 JWT_SECRET 未设置，无法启动（请配置强随机密钥）',
    );
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  const refreshExpiresIn = process.env.REFRESH_EXPIRES_IN ?? '30d';
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? jwtSecret;

  return {
    databaseUrl,
    jwtSecret,
    jwtExpiresIn,
    refreshExpiresIn,
    refreshSecret,
  };
}
