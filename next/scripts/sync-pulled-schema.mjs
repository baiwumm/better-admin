/**
 * 将 drizzle-kit pull 的产物同步为仓库内的 schema 定义（db/schema.ts）。
 *
 * 背景：pull 会把 schema.ts / relations.ts 写入 out 目录，并顺带生成
 * 初始迁移 SQL 与 meta 快照；Next 端不使用迁移（真源在 nest/drizzle/），
 * 因此 out 指向 gitignored 的 .drizzle-scratch/，本脚本把两个需要的文件
 * 拷入 db/ 并清空暂存目录。
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const scratch = join(process.cwd(), ".drizzle-scratch");
const dbDir = join(process.cwd(), "db");

for (const file of ["schema.ts", "relations.ts"]) {
  const src = join(scratch, file);

  if (!existsSync(src)) {
    console.error(`[db:pull-sync] 缺少产物 ${file}，pull 可能未成功执行`);
    process.exit(1);
  }

  let content = readFileSync(src, "utf8");
  // 修复 drizzle-kit 序列化器对空字符串默认值的输出缺陷
  // （如 posts.rank 的 ''::text 被写成 default(')，是未闭合的字面量）
  content = content.replaceAll(".default(')", ".default('')");
  // 修复 users ↔ depts 循环引用导致的 TS 推断死循环（users implicitly any）：
  // 把 users.deptId 的第三参数 FK 声明改为列上的惰性 .references()（drizzle
  // 官方对循环引用的标准写法，见 https://orm.drizzle.team 迁移生成器文档）。
  // depts.leaderId → users.id 保持在 depts 的第三参数里（users 已先行定义）。
  content = content.replace(
    /\n\s*foreignKey\(\{\s*\n\s*columns: \[table\.deptId\],\s*\n\s*foreignColumns: \[depts\.id\],\s*\n\s*name: "users_dept_id_depts_id_fk"\s*\n\s*\}\)(?:\.onDelete\("[a-z ]+"\))?/,
    "",
  );
  // 修复移除后残留的双逗号
  content = content.replace(/,\s*,/g, ",");
  content = content.replace(/,(\s*\n\s*\])/g, "$1");
  // 权限位列必须以 bigint 模式取值：super_admin 全量位 9223372036854775807
  // 超出 Number 安全整数（2^53），mode:"number"（drizzle-kit 内省默认）会
  // 精度丢失导致位运算失真；Nest 端手写 schema 即为 mode:"bigint"。
  content = content.replaceAll(
    'bigint({ mode: "number" }).default(0).notNull()',
    'bigint({ mode: "bigint" }).default(0n).notNull()',
  );
  content = content.replace(
    /(\t)deptId: text\("dept_id"\),/,
    '$1deptId: text("dept_id").references((): AnyPgColumn => depts.id),',
  );
  writeFileSync(join(dbDir, file), content);
}

rmSync(scratch, { recursive: true, force: true });

console.log("[db:pull-sync] 已同步 db/schema.ts 与 db/relations.ts，暂存目录已清除");
