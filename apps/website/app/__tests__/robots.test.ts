import { describe, expect, it } from "vitest";

import robots, { dynamic } from "@/app/robots";
import { SITE } from "@/lib/site";

/**
 * robots.txt 生成测试（SEO 守卫）。
 * 静态导出（output:'export'）下本文件在 build 期预渲染为 out/robots.txt，
 * force-static 是预渲染的硬性前提。
 */
describe("robots", () => {
  it("显式 force-static（静态导出预渲染前提）", () => {
    expect(dynamic).toBe("force-static");
  });

  it("允许全部 UA 抓取，sitemap 指向本站绝对地址", () => {
    const result = robots();

    expect(result.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(result.sitemap).toBe("https://better-admin.baiwumm.com/sitemap.xml");
    // sitemap 地址必须与 SITE.url 同源派生（换域名只改一处）
    expect(result.sitemap).toBe(new URL("/sitemap.xml", SITE.url).toString());
  });
});
