import 'dotenv/config';
import 'reflect-metadata';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../src/db/client';
import { menus, roles, roleMenus } from '../src/db/schema';
import {
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_ROLE_CODE,
} from '../src/db/schema/permissions.enum';

/**
 * 幂等迁移：录入「演示场 / Playground」菜单树
 * （docs/plan-dashboard-playground.md §5.1，含三级菜单）。
 *
 * 行为（重复执行结果不变，幂等；整棵树 + 授权在一个事务内落库）：
 * 1. 按 i18nKey 逐节点查重，不存在则插入（父级 id 取自上一层的查回 / 插入结果）；
 * 2. 目录节点：to = NULL（与线上既有目录一致，避开 menus_to_unique 部分唯一索引）；
 *    页面节点：keepAlive = true。全部节点 permissions = 0——演示页是纯展示页，不声明任何
 *    按钮位；可见性由 role_menus 关联决定（「有记录即可见」，MenusService.buildAllowedMenuIds
 *    自 2026-09-14 起不再按 permissions != 0 过滤），角色管理中照常勾选授权、页面无按钮。
 * 3. super_admin 角色对以上菜单补 role_menus 全量位（SUPER_ADMIN_BITS），
 *    保证其树节点 userPermissions 完整（模式同 migrate-menus-add-org.ts）；
 *    其余角色不做默认授权，由「角色管理」按需关联。
 *
 * 执行：cd apps/nest && npx ts-node scripts/migrate-menus-add-playground.ts
 */

type PlaygroundMenuDef = {
  i18nKey: string;
  /** i18n 缺键时的兜底文案（与 seed.ts 同口径，中文为主、英文专名保留） */
  label: string;
  /** lucide kebab-case 图标名（已核对同时存在于 lucide-react 1.x 与 @iconify-json/lucide） */
  icon: string;
  /** 页面路径；目录为 null */
  to: string | null;
  sort: number;
  children?: PlaygroundMenuDef[];
};

/** 顶级 sort=3：线上顶级菜单现状 组织中心 0 / 异常页 2 / 系统管理 2，演示场置于末尾 */
const PLAYGROUND_MENU_TREE: PlaygroundMenuDef = {
  i18nKey: 'menu.playground',
  label: '演示场',
  icon: 'flask-conical',
  to: null,
  sort: 3,
  children: [
    {
      i18nKey: 'menu.playground.codeBlock',
      label: '代码块',
      icon: 'square-code',
      to: '/playground/code-block',
      sort: 0,
    },
    {
      i18nKey: 'menu.playground.countTo',
      label: '数字动画',
      icon: 'hash',
      to: null,
      sort: 1,
      children: [
        {
          i18nKey: 'menu.playground.numberFlow',
          label: 'Number Flow',
          icon: 'arrow-up-1-0',
          to: '/playground/count-to/number-flow',
          sort: 0,
        },
        {
          i18nKey: 'menu.playground.animatedCounter',
          label: 'Animated Counter',
          icon: 'tally-5',
          to: '/playground/count-to/animated-counter',
          sort: 1,
        },
      ],
    },
    {
      i18nKey: 'menu.playground.aiKit',
      label: 'Ai Kit',
      icon: 'sparkles',
      to: null,
      sort: 2,
      children: [
        {
          i18nKey: 'menu.playground.fluidOrb',
          label: 'Fluid Orb',
          icon: 'orbit',
          to: '/playground/ai-kit/fluid-orb',
          sort: 0,
        },
        {
          i18nKey: 'menu.playground.gridReveal',
          label: 'Grid Reveal',
          icon: 'grid-2x2',
          to: '/playground/ai-kit/grid-reveal',
          sort: 1,
        },
        {
          i18nKey: 'menu.playground.matrixOrb',
          label: 'Matrix Orb',
          icon: 'atom',
          to: '/playground/ai-kit/matrix-orb',
          sort: 2,
        },
      ],
    },
    {
      i18nKey: 'menu.playground.githubActivity',
      label: 'GitHub Activity',
      icon: 'calendar-days',
      to: '/playground/github-activity',
      sort: 3,
    },
  ],
};

const TAG = '[migrate-menus-add-playground]';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** 按 i18nKey 幂等落库一个节点及其子树，返回子树全部菜单 id（含自身） */
async function ensureMenuSubtree(
  tx: Tx,
  def: PlaygroundMenuDef,
  parentId: string | null,
  depth: number,
): Promise<string[]> {
  const indent = '  '.repeat(depth);
  const isDirectory = def.to === null;

  const [existing] = await tx
    .select({ id: menus.id })
    .from(menus)
    .where(eq(menus.i18nKey, def.i18nKey))
    .limit(1);

  let id: string;
  if (existing) {
    id = existing.id;
    console.log(`${TAG} ${indent}「${def.label}」已存在(id=${id})，跳过。`);
  } else {
    const [created] = await tx
      .insert(menus)
      .values({
        id: nanoid(),
        label: def.label,
        i18nKey: def.i18nKey,
        icon: def.icon,
        to: def.to,
        parentId,
        sort: def.sort,
        keepAlive: !isDirectory,
        enabled: true,
        permissions: 0n,
      })
      .returning({ id: menus.id });
    id = created.id;
    console.log(
      `${TAG} ${indent}已插入${isDirectory ? '目录' : '页面'}「${def.label}」(id=${id}${def.to ? `, to=${def.to}` : ''})。`,
    );
  }

  const ids = [id];
  for (const child of def.children ?? []) {
    ids.push(...(await ensureMenuSubtree(tx, child, id, depth + 1)));
  }
  return ids;
}

async function main() {
  await db.transaction(async (tx) => {
    // 1 + 2. 整棵树按 i18nKey 幂等落库
    const menuIds = await ensureMenuSubtree(tx, PLAYGROUND_MENU_TREE, null, 0);

    // 3. super_admin 补录全量授权位（其余角色由「角色管理」按需关联）
    const [superAdminRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, SUPER_ADMIN_ROLE_CODE));
    if (!superAdminRole) {
      throw new Error(`${TAG} 未找到 super_admin 角色。`);
    }

    await tx
      .insert(roleMenus)
      .values(
        menuIds.map((menuId) => ({
          roleId: superAdminRole.id,
          menuId,
          permissions: SUPER_ADMIN_BITS,
        })),
      )
      .onConflictDoNothing();

    console.log(`${TAG} 菜单树共 ${menuIds.length} 个节点就绪，super_admin 授权已补录。`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`${TAG} 失败:`, err);
    process.exit(1);
  });
