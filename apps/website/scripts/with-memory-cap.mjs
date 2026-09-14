// 给 next dev/build/start 套一层 V8 堆内存上限。
// 用法: node scripts/with-memory-cap.mjs <dev|build|start> [next 参数...]
// 上限默认 8192MB,可用环境变量 NEXT_MEM_CAP_MB 覆盖。
// 超限时进程直接抛 "JavaScript heap out of memory" 报错退出,
// 而不是把系统提交内存吃光导致整机冻结。
// 注意:Turbopack 编译期的部分原生(Rust)内存不受此上限约束,
// 兜底仍依赖足够大的页面文件。
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nextBin = join(here, '..', 'node_modules', 'next', 'dist', 'bin', 'next');

const args = process.argv.slice(2);
if (args.length === 0 || !existsSync(nextBin)) {
  console.error('用法: node scripts/with-memory-cap.mjs <dev|build|start> [next 参数...]');
  if (!existsSync(nextBin)) console.error(`未找到 next CLI: ${nextBin}`);
  process.exit(1);
}

const capMb = Number(process.env.NEXT_MEM_CAP_MB) || 8192;
console.log(`[with-memory-cap] 本次 V8 堆上限 ${capMb}MB(调整方式: NEXT_MEM_CAP_MB=<MB> pnpm <script>)`);

const result = spawnSync(
  process.execPath,
  [`--max-old-space-size=${capMb}`, nextBin, ...args],
  { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${capMb}` } },
);

if (result.status !== 0) {
  console.error(
    `[with-memory-cap] 进程退出码 ${result.status}。` +
      '若上方出现 "JavaScript heap out of memory",说明触达堆内存上限;' +
      '可在页面文件加大后用更高上限重跑,例如: NEXT_MEM_CAP_MB=12288 pnpm build',
  );
}
process.exit(result.status ?? 1);
