import { config as loadDotenv } from 'dotenv';
import { requireTestDatabaseUrl, withSearchPath } from './test-env';

// dotenv 不覆盖已存在的进程环境变量：CI 用 job env 注入时保持注入值优先。
loadDotenv({ path: '.env', quiet: true });

// 必须先于测试文件 import AppModule 执行（vitest setupFiles 语义）：
// src/db/client.ts 在模块加载期读取 DATABASE_URL，此处替换为 e2e schema 串后，
// 应用与 fixtures 共享的连接全程落在隔离 schema 内。
process.env.DATABASE_URL = withSearchPath(requireTestDatabaseUrl());

// CI 等无 .env 场景的兜底密钥（仅保证 loadConfig fail-fast 通过，不用于生产）。
process.env.JWT_SECRET ||= 'e2e-test-jwt-secret';
process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret';

// 与常规部署默认一致；demo.e2e-spec.ts 在文件内自行切换为 true。
process.env.DEMO_MODE = 'false';
