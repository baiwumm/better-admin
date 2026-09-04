/**
 * 从 /react 同步 i18n 语言包到 /vue（七个命名空间 JSON，文案零漂移）。
 * react 目录不存在时静默跳过（独立部署场景）。
 */
import { cpSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const repoRoot = resolve(projectRoot, "..");

const source = join(repoRoot, "react", "src", "i18n", "locales");
const target = join(projectRoot, "src", "i18n", "locales");

if (!existsSync(source)) {
  console.warn("[sync-locales] react locales not found, skip syncing");

  process.exit(0);
}

cpSync(source, target, { recursive: true });
console.log("[sync-locales] locales synced from react");
