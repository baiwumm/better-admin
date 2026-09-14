import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// 读取 .env（服务端环境变量，不提交到仓库）
config();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
