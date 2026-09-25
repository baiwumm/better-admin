import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';

export interface TestApp {
  app: INestApplication;
  baseUrl: string;
}

export interface ApiResult<T = Record<string, unknown>> {
  status: number;
  body: T | null;
}

/**
 * 起真实 AppModule 的 HTTP 实例（随机端口）。
 *
 * 全局配置与 src/main.ts 保持同步（全局前缀 /api + 全局 ValidationPipe 同参数）——
 * Test 模块不经过 main.ts 的 bootstrap，二者任一变更须同步另一处。
 * CORS / Swagger 文档不影响行为断言，不起。
 */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  // logger 保留 error/warn 级：500 等未捕获异常的堆栈直接落到测试输出，便于定位
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  await app.init();
  await app.listen(0);
  return { app, baseUrl: await app.getUrl() };
}

export async function closeTestApp({ app }: TestApp): Promise<void> {
  await app.close();
}

/**
 * 极薄 fetch 助手：自动拼 /api 前缀与 Bearer 头。
 * 响应结构基线（断言依赖）：成功体为 { data }（列表另带 pagination），
 * 错误体为顶层 { code, message }，204 空体 body 为 null。
 */
export async function api(
  { baseUrl }: TestApp,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<ApiResult> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

export interface LoginSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; permissions: string };
}

/** 同用户上次登录时间戳（进程内）：已知缺陷规避，见 login。 */
const lastLoginAt = new Map<string, number>();

/** 登录并拆包 { data }；非 200 直接抛错（前置步骤失败不应表现为下游断言失败）。 */
export async function login(
  app: TestApp,
  username: string,
  password: string,
): Promise<LoginSession> {
  // 已知缺陷规避（mechanisms §42 坑 4，根治待拍板）：refresh token JWT 无 jti 且
  // iat 秒级精度，同一用户同秒二次登录签发完全相同令牌串，撞
  // refresh_tokens.token_hash 唯一索引 → 500。对同用户登录强制 >1s 间隔。
  const prev = lastLoginAt.get(username) ?? 0;
  const wait = prev + 1_100 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastLoginAt.set(username, Date.now());

  const res = await api(app, 'POST', '/auth/login', { body: { username, password } });
  if (res.status !== 200) {
    throw new Error(`[e2e] 登录失败 ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return (res.body as { data: LoginSession }).data;
}
