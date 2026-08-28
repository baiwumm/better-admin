/**
 * 版本同步脚本：把根 package.json 的 version 分发到各子项目 package.json。
 *
 * 版本约定（见 AGENTS.md §15）：根 package.json 是产品级版本的唯一真源，
 * 各子项目（同一产品的多套实现 + 后端）在同一 release 内与根保持一致。
 * 发布流程：改根 version → `pnpm sync-versions` → 单个提交 → 打 git tag。
 *
 * 子项目按目录名列举、存在才处理——后续新增 vue / next / nuxt 时脚本
 * 无需改动；version 未变化的文件不重写（保持 git diff 干净）。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUB_PROJECTS = ["react", "vue", "next", "nuxt", "nest"];

const rootPkg = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

if (!rootPkg.version) {
  console.error("根 package.json 缺少 version 字段，终止同步。");

  process.exit(1);
}

const version = rootPkg.version;
let updated = 0;
let unchanged = 0;

for (const dir of SUB_PROJECTS) {
  const pkgPath = path.join(rootDir, dir, "package.json");

  if (!existsSync(pkgPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  if (pkg.version === version) {
    unchanged += 1;

    continue;
  }

  const previous = pkg.version ?? "(缺失)";

  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  updated += 1;
  console.log(`${dir}: ${previous} -> ${version}`);
}

console.log(
  `版本同步完成（目标 ${version}）：更新 ${updated} 个，一致 ${unchanged} 个。`,
);
