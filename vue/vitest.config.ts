import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * 测试策略（vue-plan v1.1 微调 3）：
 * - globals: true + environment: 'jsdom'（组件测试需要 DOM 环境）
 * - 纯函数测试（permission / tabs-model / format-date）从 React 拷贝平移，纯 TS 无 JSX
 * - 组件测试用 @vue/test-utils 独立编写；无覆盖率硬性要求
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
