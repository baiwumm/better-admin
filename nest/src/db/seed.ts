// 置顶加载 .env：client.ts 在模块加载期即读取 process.env.DATABASE_URL，
// 必须保证 env 先于任何业务模块被求值。
import 'dotenv/config';
import 'reflect-metadata';
import { hash } from 'bcrypt';
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

async function seed() {
  // ---------- 角色 ----------
  const superAdminRoleId = nanoid();
  const adminRoleId = nanoid();

  await db
    .insert(roles)
    .values([
      {
        id: superAdminRoleId,
        name: '超级管理员',
        code: SUPER_ADMIN_ROLE_CODE,
        description: '全量权限，系统内置',
        enabled: true,
        sort: 0,
      },
      {
        id: adminRoleId,
        name: '管理员',
        code: 'admin',
        description: '常规管理权限',
        enabled: true,
        sort: 1,
      },
    ])
    .onConflictDoNothing(); // 幂等：角色已存在则跳过

  // ---------- 用户（admin / 密码 bcrypt 哈希） ----------
  const adminUserId = nanoid();
  const passwordHash = await hash(SEED_ADMIN_PASSWORD, BCRYPT_ROUNDS);

  await db
    .insert(users)
    .values({
      id: adminUserId,
      username: 'admin',
      email: 'admin@baiwumm.com',
      passwordHash,
      displayName: '管理员',
      status: 'active',
    })
    .onConflictDoNothing();

  // 关联 admin → super_admin
  await db
    .insert(userRoles)
    .values({ userId: adminUserId, roleId: superAdminRoleId })
    .onConflictDoNothing();

  // ---------- 菜单树 ----------
  // 系统管理（用户 / 角色 / 权限 / 菜单 / 字典 / 日志）
  const mSystem = nanoid();
  const mUsers = nanoid();
  const mRoles = nanoid();
  const mPermissions = nanoid();
  const mMenus = nanoid();
  const mDicts = nanoid();
  const mLogs = nanoid();
  // 组织中心（v1.6.0 阶段 1：组织管理；阶段 2 追加岗位 / 通讯录）
  const mOrg = nanoid();
  const mDepts = nanoid();

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

  await db
    .insert(menus)
    .values([
      {
        id: mSystem,
        label: '系统管理',
        i18nKey: 'menu.system',
        icon: 'settings-2',
        to: '',
        parentId: null,
        sort: 1,
        enabled: true,
        permissions: 0n,
      },
      {
        id: mUsers,
        label: '用户管理',
        i18nKey: 'menu.users',
        icon: 'users',
        to: '/settings/users',
        parentId: mSystem,
        sort: 0,
        enabled: true,
        permissions: menuFullBits,
      },
      {
        id: mRoles,
        label: '角色管理',
        i18nKey: 'menu.roles',
        icon: 'shield',
        to: '/settings/roles',
        parentId: mSystem,
        sort: 1,
        enabled: true,
        permissions: rolesMenuBits,
      },
      {
        id: mPermissions,
        label: '权限管理',
        i18nKey: 'menu.permissions',
        icon: 'key-round',
        to: '/settings/permissions',
        parentId: mSystem,
        sort: 2,
        enabled: true,
        permissions: menuFullBits,
      },
      {
        id: mMenus,
        label: '菜单管理',
        i18nKey: 'menu.menus',
        icon: 'menu',
        to: '/settings/menus',
        parentId: mSystem,
        sort: 3,
        enabled: true,
        permissions: menuFullBits,
      },
      {
        id: mDicts,
        label: '字典管理',
        i18nKey: 'menu.dicts',
        icon: 'book-text',
        to: '/settings/dicts',
        parentId: mSystem,
        sort: 4,
        enabled: true,
        permissions: menuFullBits,
      },
      {
        id: mLogs,
        label: '日志管理',
        i18nKey: 'menu.logs',
        icon: 'scroll-text',
        to: '/settings/logs',
        parentId: mSystem,
        sort: 5,
        enabled: true,
        permissions: menuFullBits,
      },
      {
        id: mOrg,
        label: '组织中心',
        i18nKey: 'menu.org',
        icon: 'building-2',
        to: '',
        parentId: null,
        sort: 2,
        enabled: true,
        permissions: 0n,
      },
      {
        id: mDepts,
        label: '组织管理',
        i18nKey: 'menu.depts',
        icon: 'network',
        to: '/org/depts',
        parentId: mOrg,
        sort: 0,
        enabled: true,
        permissions: menuFullBits,
      },
    ])
    .onConflictDoNothing();

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
