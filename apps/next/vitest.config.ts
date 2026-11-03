import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * 测试策略（与 react / vue 端同一框架与风格，见 AGENTS.md §16）：
 * - environment: 'node' —— 用例只覆盖 src/lib 纯逻辑（权限位 / 密码策略 /
 *   路由访问与标题兜底 / 日期格式化），无 DOM 依赖，不引入 jsdom；
 * - 用例就近放在 src/...\__tests__\ 下（与 react / vue 端目录约定一致）；
 *   无覆盖率硬性要求。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
