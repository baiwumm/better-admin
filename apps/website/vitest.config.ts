import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * 测试策略（与 react / vue / next 端同一框架与风格，见 AGENTS.md §16）：
 * - environment: 'node' —— 用例只覆盖纯逻辑（站点常量 / 动效 token / SEO 路由），
 *   无 DOM 依赖，不引入 jsdom；
 * - 用例就近放在 __tests__\ 下；无覆盖率硬性要求；
 * - 不导入 lib/source.ts 等依赖 .source 生成物的模块（CI 上 .source 由
 *   postinstall 生成，但测试应与内容编译解耦）。
 */
export default defineConfig({
  resolve: {
    alias: {
      // 与 tsconfig paths 对齐：@/* → 项目根（本端非 src 目录结构）
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["{app,components,lib}/**/__tests__/**/*.test.ts"],
  },
});
