import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // cwd 恒为 apps/nest（pnpm test / CI working-directory 一致）
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/setup/global-setup.ts'],
    setupFiles: ['test/setup/env.ts'],
    testTimeout: 30_000,
    hookTimeout: 90_000,
    // 串行执行：用例间存在共享库状态（super_admin 摘绑 / 角色启停等写操作），
    // 并行会引入跨文件干扰；e2e 不追求并行速度，确定性优先。
    fileParallelism: false,
  },
});
