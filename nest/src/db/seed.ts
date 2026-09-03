// 置顶加载 .env：client.ts 在模块加载期即读取 process.env.DATABASE_URL，
// 必须保证 env 先于任何业务模块被求值。
import 'dotenv/config';
import 'reflect-metadata';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from './client';
import {
  users,
  roles,
  menus,
  userRoles,
  roleMenus,
  dictTypes,
  dictItems,
} from './schema';
import { SUPER_ADMIN_BITS, Permissions, SUPER_ADMIN_ROLE_CODE } from './schema/permissions.enum';

/**
 * Phase 2 初始化种子脚本（详见 database-design.md §4 与 §6）
 *
 * 超级管理员防御逻辑：
 * - super_admin 角色权限位使用 SUPER_ADMIN_BITS（-1n，bigint 全 1 掩码），
 *   禁止硬编码具体数值（如 127）。hasPermission 守卫中识别 -1n 为全量权限，
 *   确保后续新增权限点时无需修改种子数据。
 * - role_menus 插入时 permissions 使用 SUPER_ADMIN_BITS（全量位），
 *   而非硬编码的子集数值。
 * - admin 用户密码使用 bcrypt 哈希，读取环境变量 SEED_ADMIN_PASSWORD（缺省 admin123）。
 */

const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
const BCRYPT_ROUNDS = 10;

/**
 * 幂等取 id：按业务键查询，缺则插入（随机 id），返回库内真实 id。
 * 已有数据的库上重跑 seed 时 onConflictDoNothing 会跳过插入，
 * 随机 id 不落库，后续引用将触发外键违规——所有「先插后引」的实体必须经此解析。
 */
async function resolveSeedId(
  query: () => Promise<{ id: string } | undefined>,
  insert: () => Promise<{ id: string }>,
): Promise<string> {
  const existing = await query();
  if (existing) return existing.id;
  const row = await insert();
  return row.id;
}

async function seed() {
  // ---------- 角色（按 code 幂等） ----------
  const superAdminRoleId = await resolveSeedId(
    async () => {
      const [row] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.code, SUPER_ADMIN_ROLE_CODE))
        .limit(1);
      return row;
    },
    async () => {
      const [row] = await db
        .insert(roles)
        .values({
          id: nanoid(),
          name: '超级管理员',
          code: SUPER_ADMIN_ROLE_CODE,
          description: '全量权限，系统内置',
          enabled: true,
          sort: 0,
        })
        .returning({ id: roles.id });
      return row;
    },
  );

  // admin 角色当前无绑定引用，仍需保证存在（保留解析调用触发插入）
  await resolveSeedId(
    async () => {
      const [row] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.code, 'admin'))
        .limit(1);
      return row;
    },
    async () => {
      const [row] = await db
        .insert(roles)
        .values({
          id: nanoid(),
          name: '管理员',
          code: 'admin',
          description: '常规管理权限',
          enabled: true,
          sort: 1,
        })
        .returning({ id: roles.id });
      return row;
    },
  );

  // ---------- 用户（admin / 密码 bcrypt 哈希） ----------
  // 已有 admin 的库上重跑 seed 时插入被跳过，必须查回真实 id，
  // 否则后续 user_roles 引用随机 id 触发外键违规
  const adminUserId = nanoid();
  const passwordHash = await hash(SEED_ADMIN_PASSWORD, BCRYPT_ROUNDS);

  const [adminInsertRow] = await db
    .insert(users)
    .values({
      id: adminUserId,
      username: 'admin',
      email: 'admin@baiwumm.com',
      passwordHash,
      displayName: '管理员',
      status: 'active',
    })
    .onConflictDoNothing()
    .returning({ id: users.id });

  const adminResolvedId =
    adminInsertRow?.id ??
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, 'admin'))
        .limit(1)
    )[0]?.id;

  if (!adminResolvedId) {
    throw new Error('[seed] admin 用户缺失且插入失败');
  }

  // 关联 admin → super_admin
  await db
    .insert(userRoles)
    .values({ userId: adminResolvedId, roleId: superAdminRoleId })
    .onConflictDoNothing();

  // ---------- 菜单树（按 i18nKey 幂等：已有数据的库重跑时查回真实 id） ----------
  // 菜单声明可用按钮位（全量位：搜索/新增/编辑/删除/批量删/新增子级/重置/重置密码）
  const menuFullBits =
    Permissions.SEARCH.bits |
    Permissions.ADD.bits |
    Permissions.EDIT.bits |
    Permissions.DELETE.bits |
    Permissions.BATCH_DELETE.bits |
    Permissions.ADD_CHILD.bits |
    Permissions.RESET.bits |
    Permissions.RESET_PASSWORD.bits;

  // 菜单授权（GRANT）仅角色管理页使用：只有角色管理菜单声明该位
  const rolesMenuBits = menuFullBits | Permissions.GRANT.bits;

  type MenuInsertValues = Omit<typeof menus.$inferInsert, 'id' | 'i18nKey'>;

  const resolveMenu = (i18nKey: string, values: MenuInsertValues) =>
    resolveSeedId(
      async () => {
        const [row] = await db
          .select({ id: menus.id })
          .from(menus)
          .where(eq(menus.i18nKey, i18nKey))
          .limit(1);
        return row;
      },
      async () => {
        const [row] = await db
          .insert(menus)
          .values({ ...values, i18nKey, id: nanoid() })
          .returning({ id: menus.id });
        return row;
      },
    );

  // 系统管理（用户 / 角色 / 权限 / 菜单 / 字典 / 日志）
  const mSystem = await resolveMenu('menu.system', {
    label: '系统管理',
    icon: 'settings-2',
    to: '',
    parentId: null,
    sort: 1,
    enabled: true,
    permissions: 0n,
  });
  const mUsers = await resolveMenu('menu.users', {
    label: '用户管理',
    icon: 'users',
    to: '/settings/users',
    parentId: mSystem,
    sort: 0,
    enabled: true,
    permissions: menuFullBits,
  });
  const mRoles = await resolveMenu('menu.roles', {
    label: '角色管理',
    icon: 'shield',
    to: '/settings/roles',
    parentId: mSystem,
    sort: 1,
    enabled: true,
    permissions: rolesMenuBits,
  });
  const mPermissions = await resolveMenu('menu.permissions', {
    label: '权限管理',
    icon: 'key-round',
    to: '/settings/permissions',
    parentId: mSystem,
    sort: 2,
    enabled: true,
    permissions: menuFullBits,
  });
  const mMenus = await resolveMenu('menu.menus', {
    label: '菜单管理',
    icon: 'menu',
    to: '/settings/menus',
    parentId: mSystem,
    sort: 3,
    enabled: true,
    permissions: menuFullBits,
  });
  const mDicts = await resolveMenu('menu.dicts', {
    label: '字典管理',
    icon: 'book-text',
    to: '/settings/dicts',
    parentId: mSystem,
    sort: 4,
    enabled: true,
    permissions: menuFullBits,
  });
  const mLogs = await resolveMenu('menu.logs', {
    label: '日志管理',
    icon: 'scroll-text',
    to: '/settings/logs',
    parentId: mSystem,
    sort: 5,
    enabled: true,
    permissions: menuFullBits,
  });
  // 组织中心（v1.6.0 阶段 1：组织管理；阶段 2：岗位管理 / 人员通讯录；阶段 3：公告管理）
  const mOrg = await resolveMenu('menu.org', {
    label: '组织中心',
    icon: 'building-2',
    to: '',
    parentId: null,
    sort: 2,
    enabled: true,
    permissions: 0n,
  });
  const mDepts = await resolveMenu('menu.depts', {
    label: '组织管理',
    icon: 'network',
    to: '/org/depts',
    parentId: mOrg,
    sort: 0,
    enabled: true,
    permissions: menuFullBits,
  });
  const mPosts = await resolveMenu('menu.posts', {
    label: '岗位管理',
    icon: 'briefcase',
    to: '/org/posts',
    parentId: mOrg,
    sort: 1,
    enabled: true,
    permissions: menuFullBits,
  });
  const mDirectory = await resolveMenu('menu.directory', {
    label: '人员通讯录',
    icon: 'book-user',
    to: '/org/directory',
    parentId: mOrg,
    sort: 2,
    enabled: true,
    permissions: menuFullBits,
  });
  const mNotices = await resolveMenu('menu.notices', {
    label: '公告管理',
    icon: 'megaphone',
    to: '/org/notices',
    parentId: mOrg,
    sort: 3,
    enabled: true,
    permissions: menuFullBits,
  });
  // 组织架构图谱（阶段 4：React Flow 只读可视化，复用组织树接口）
  const mOrgChart = await resolveMenu('menu.org-chart', {
    label: '架构图谱',
    icon: 'git-fork',
    to: '/org/chart',
    parentId: mOrg,
    sort: 4,
    enabled: true,
    permissions: menuFullBits,
  });

  // ---------- 角色菜单授权 ----------
  // 关键防御：使用 SUPER_ADMIN_BITS（全量位 -1n），禁止硬编码 127。
  // super_admin 对所有菜单拥有全量授权位。
  const allMenuIds = [
    mSystem,
    mUsers,
    mRoles,
    mPermissions,
    mMenus,
    mDicts,
    mLogs,
    mOrg,
    mDepts,
    mPosts,
    mDirectory,
    mNotices,
    mOrgChart,
  ];
  await db
    .insert(roleMenus)
    .values(
      allMenuIds.map((menuId) => ({
        roleId: superAdminRoleId,
        menuId,
        // 全量位：新增权限点时此种子自动覆盖，无需改数据
        permissions: SUPER_ADMIN_BITS,
      })),
    )
    .onConflictDoNothing();

  // ---------- 字典初值 ----------
  await db
    .insert(dictTypes)
    .values([
      {
        id: nanoid(),
        code: 'user_status',
        name: '用户状态',
        description: '用户启用/停用状态',
      },
      {
        id: nanoid(),
        code: 'log_type',
        name: '日志类型',
        description: '日志 type 分类',
      },
      {
        id: nanoid(),
        code: 'notice_status',
        name: '公告状态',
        description: '公告 status 分类（draft/published/withdrawn）',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(dictItems)
    .values([
      {
        id: nanoid(),
        typeCode: 'user_status',
        value: 'active',
        label: '启用',
        i18nKey: 'dict.user_status.active',
        sort: 0,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'user_status',
        value: 'disabled',
        label: '停用',
        i18nKey: 'dict.user_status.disabled',
        sort: 1,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'log_type',
        value: 'operation',
        label: '操作日志',
        i18nKey: 'dict.log_type.operation',
        sort: 0,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'log_type',
        value: 'login',
        label: '登录日志',
        i18nKey: 'dict.log_type.login',
        sort: 1,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'log_type',
        value: 'api',
        label: 'API 日志',
        i18nKey: 'dict.log_type.api',
        sort: 2,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'log_type',
        value: 'error',
        label: '错误日志',
        i18nKey: 'dict.log_type.error',
        sort: 3,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'notice_status',
        value: 'draft',
        label: '草稿',
        i18nKey: 'dict.notice_status.draft',
        sort: 0,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'notice_status',
        value: 'published',
        label: '已发布',
        i18nKey: 'dict.notice_status.published',
        sort: 1,
        enabled: true,
      },
      {
        id: nanoid(),
        typeCode: 'notice_status',
        value: 'withdrawn',
        label: '已撤回',
        i18nKey: 'dict.notice_status.withdrawn',
        sort: 2,
        enabled: true,
      },
    ])
    .onConflictDoNothing();

  console.log('[seed] Phase 2 种子数据写入完成。');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
     
    console.error('[seed] 种子写入失败:', err);
    process.exit(1);
  });
