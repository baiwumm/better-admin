/**
 * 从 /react 同步 i18n 语言包到 /vue（七个命名空间 JSON，文案零漂移）。
 * react 目录不存在时静默跳过（独立部署场景）。
 *
 * 同步后对文案值做 vue-i18n 兼容转义：`@` 是 vue-i18n linked message
 * 语法前缀（`@:key`），i18next 无此语义——裸 `@`（如 email 占位符
 * name@example.com）会让消息编译抛 SyntaxError、组件渲染中断，
 * 统一转义为字面量插值 `{'@'}`。
 */
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const repoRoot = resolve(projectRoot, "..");

const source = join(repoRoot, "react", "src", "i18n", "locales");
const target = join(projectRoot, "src", "i18n", "locales");

/** 递归转义消息值中的裸 `@`（vue-i18n linked 语法 → 字面量插值）。
 * 先还原已有 `{'@'}` 再统一转义，保证重复执行幂等。 */
function escapeAtSymbols(value) {
  if (typeof value === "string") {
    return value.replaceAll("{'@'}", "@").replaceAll("@", "{'@'}");
  }

  if (Array.isArray(value)) {
    return value.map((item) => escapeAtSymbols(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, escapeAtSymbols(item)]),
    );
  }

  return value;
}

/** 递归遍历目录下所有 .json 文件（locales/<locale>/<ns>.json 两级）。 */
function listJsonFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listJsonFiles(entryPath));
    } else if (entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files;
}

if (!existsSync(source)) {
  console.warn("[sync-locales] react locales not found, skip syncing");

  process.exit(0);
}

cpSync(source, target, { recursive: true });

for (const filePath of listJsonFiles(target)) {
  const messages = escapeAtSymbols(JSON.parse(readFileSync(filePath, "utf8")));

  writeFileSync(filePath, `${JSON.stringify(messages, null, 2)}\n`);
}

console.log("[sync-locales] locales synced from react (@ escaped)");
