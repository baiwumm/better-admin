import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { Analytics } from "@vercel/analytics/vue";

const Empty = { template: "<div />" };

/**
 * 兼容性守卫：@vercel/analytics@2.0.1 的 peer 只声明 vue-router ^4，本项目实装 5.x。
 * 本测试锁定「包在 v5 下仍能拿到 useRoute 并上报归一后的 route」——任一侧升级
 * 改动 useRoute / 组件内部依赖时先在这里红，而不是等线上静默丢事件。
 */
describe("@vercel/analytics/vue × vue-router 5", () => {
  it("挂载即产出 pageview，动态段归一为 [param]", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: Empty },
        { path: "/org/notices/:noticeId", component: Empty },
      ],
    });

    await router.push("/org/notices/12");
    await router.isReady();

    mount(Analytics, { global: { plugins: [router] } });

    const pageviews = (window.vaq ?? []).filter(
      ([event]) => event === "pageview",
    );

    expect(pageviews.length).toBeGreaterThan(0);

    const payload = pageviews.at(-1)?.[1] as { route?: string; path?: string };

    expect(payload.path).toBe("/org/notices/12");
    expect(payload.route).toBe("/org/notices/[noticeId]");
  });
});
