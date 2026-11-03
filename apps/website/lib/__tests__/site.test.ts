import { describe, expect, it } from "vitest";

import { repository } from "../../package.json";

import { STACK_ICON_ENTRIES } from "@/components/icons/stack-icons";
import { DEMOS, SITE } from "@/lib/site";

/**
 * 站点常量真源测试：GitHub 链接全部派生自本端 package.json 的 repository.url
 * （与四端 lib/env.ts 同一机制），换仓库归属只改 package.json。
 * 本测试把「派生结果」与「真源字段」钉死，防两类漂移：
 * repository.url 被改坏（parseGitHubRepo 静默产出错链接）、SITE 被手改绕过派生。
 */
describe("site", () => {
  describe("SITE 与 package.json repository.url 同源", () => {
    it("repository.url 指向 baiwumm/better-admin（测试 fixture 跟随真源）", () => {
      expect(repository.url).toContain("github.com/baiwumm/better-admin");
    });

    it("派生字段与真源一致", () => {
      expect(SITE.github).toBe("https://github.com/baiwumm/better-admin");
      expect(SITE.owner).toBe("baiwumm");
      expect(SITE.ownerUrl).toBe("https://github.com/baiwumm");
      expect(SITE.repoFullName).toBe("baiwumm/better-admin");
    });

    it("站点 URL 为 https 且无尾斜杠（robots / sitemap 用 new URL(path, SITE.url) 拼接）", () => {
      expect(SITE.url).toMatch(/^https:\/\//);
      expect(SITE.url.endsWith("/")).toBe(false);
    });

    it("站点名称 / 标题 / 描述非空（SEO 元信息兜底）", () => {
      expect(SITE.name.length).toBeGreaterThan(0);
      expect(SITE.title).toContain(SITE.name);
      expect(SITE.description.length).toBeGreaterThan(0);
    });
  });

  describe("DEMOS 演示站清单（侧栏外链）", () => {
    it("恰好四个前端演示站，名称唯一", () => {
      expect(DEMOS).toHaveLength(4);
      expect(new Set(DEMOS.map((d) => d.name)).size).toBe(DEMOS.length);
    });

    it("全部为 https 外链且不含本站自身", () => {
      for (const demo of DEMOS) {
        expect(demo.url).toMatch(/^https:\/\//);
        expect(demo.url).not.toContain(new URL(SITE.url).hostname);
      }
    });

    it("icon 全部命中 stack-icons 的已知技术栈键（防侧栏图标断链）", () => {
      const validKeys = new Set(STACK_ICON_ENTRIES.map((e) => e.stack));

      for (const demo of DEMOS) {
        expect(validKeys.has(demo.icon)).toBe(true);
      }
    });
  });
});
