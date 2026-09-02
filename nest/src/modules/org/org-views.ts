import { BadRequestException } from '@nestjs/common';
import {
  and,
  eq,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { db } from '../../db/client';
import { depts, users, userPosts, posts } from '../../db/schema';

/**
 * 组织与权限中心共享视图 helper（岗位列表 / 通讯录 / 岗位成员穿透共用）。
 *
 * - deptPath：组织完整路径（祖先链 name 以 "/" 连接，如「集团/技术部/前端组」），
 *   一次性拉全量未删组织在内存拼链（5000 节点量级无压力）；
 * - 通讯录摘要装载：users 的组织路径 + 主岗（user_posts.is_main → posts），
 *   两条聚合查询，避免逐行 N+1。
 */

/** 全量未删组织的 deptId → 完整路径映射 */
export async function buildDeptPathMap(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: depts.id, parentId: depts.parentId, name: depts.name })
    .from(depts)
    .where(isNull(depts.deletedAt));

  const parentMap = new Map(rows.map((r) => [r.id, r.parentId]));
  const nameMap = new Map(rows.map((r) => [r.id, r.name]));
  const pathMap = new Map<string, string>();

  const buildPath = (id: string): string => {
    const cached = pathMap.get(id);
    if (cached) return cached;

    const segments: string[] = [];
    let cursor: string | null | undefined = id;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      segments.unshift(nameMap.get(cursor) ?? '');
      cursor = parentMap.get(cursor) ?? null;
    }
    const path = segments.join('/');
    for (const segId of seen) pathMap.set(segId, path);
    return path;
  };

  for (const row of rows) buildPath(row.id);
  return pathMap;
}

/** 收集组织及其全部下级组织 ID（未删除；递归 CTE，两步查询实现） */
export async function collectDeptSubtreeIds(
  deptId: string,
): Promise<string[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE dept_tree AS (
      SELECT id FROM depts WHERE id = ${deptId} AND deleted_at IS NULL
      UNION ALL
      SELECT d.id FROM depts d
        INNER JOIN dept_tree dt ON d.parent_id = dt.id
      WHERE d.deleted_at IS NULL
    )
    SELECT id FROM dept_tree
  `);

  return (result.rows as { id: string }[]).map((row) => row.id);
}

/** 用户在职判定（未删除且未离职；employment_status NULL 视为在职） */
export const employedUserFilter = and(
  isNull(users.deletedAt),
  // employment_status 为 NULL 的存量数据按在职处理
  sql`(${users.employmentStatus} IS NULL OR ${users.employmentStatus} <> 'resigned')`,
);

/**
 * 校验所属组织：存在、未删除且启用（停用组织不可关联新数据）。
 * 岗位管理与用户管理的组织关联共用。
 */
export async function assertValidDeptId(deptId: string) {
  const row = await db.query.depts.findFirst({
    where: and(eq(depts.id, deptId), isNull(depts.deletedAt)),
  });
  if (!row || row.status !== 'enabled') {
    throw new BadRequestException({
      code: 'DEPT_NOT_FOUND',
      message: '所属组织不存在或已停用',
    });
  }
}

/** 校验岗位 id 全部有效（存在、未删除且启用），无效时抛 VALIDATION_ERROR（对齐 assertValidRoleIds 风格） */
export async function assertValidPostIds(postIds: string[]) {
  if (postIds.length === 0) return;
  const rows = await db
    .select({ id: posts.id, status: posts.status })
    .from(posts)
    .where(and(isNull(posts.deletedAt), inArray(posts.id, postIds)));
  const validIds = new Set(
    rows.filter((r) => r.status === 'enabled').map((r) => r.id),
  );
  const invalid = postIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `岗位不存在或已停用: ${invalid.join(', ')}`,
    });
  }
}

export interface DirectoryExtras {
  deptId: string | null;
  deptPath: string | null;
  mainPostId: string | null;
  mainPostName: string | null;
}

/**
 * 批量装载通讯录摘要：userId → { deptId, deptPath, mainPostId, mainPostName }。
 * deptPath 依赖全量组织路径映射；主岗取 user_posts.is_main 的那条（至多一条由业务层保证）。
 */
export async function loadDirectoryExtras(
  userIds: string[],
  deptPathMap?: Map<string, string>,
): Promise<Map<string, DirectoryExtras>> {
  const map = new Map<string, DirectoryExtras>();
  if (userIds.length === 0) return map;

  const userRows = await db
    .select({ id: users.id, deptId: users.deptId })
    .from(users)
    .where(inArray(users.id, userIds));
  for (const row of userRows) {
    map.set(row.id, {
      deptId: row.deptId,
      deptPath: null,
      mainPostId: null,
      mainPostName: null,
    });
  }

  if (!deptPathMap) deptPathMap = await buildDeptPathMap();
  for (const extras of map.values()) {
    extras.deptPath = extras.deptId ? (deptPathMap.get(extras.deptId) ?? null) : null;
  }

  // 主岗联查（user_posts is_main → posts，岗位未删除才算主岗有效）
  const mainRows = await db
    .select({
      userId: userPosts.userId,
      postId: posts.id,
      postName: posts.name,
    })
    .from(userPosts)
    .innerJoin(posts, and(eq(userPosts.postId, posts.id), isNull(posts.deletedAt)))
    .where(and(inArray(userPosts.userId, userIds), eq(userPosts.isMain, true)));
  for (const row of mainRows) {
    const extras = map.get(row.userId);
    if (extras) {
      extras.mainPostId = row.postId;
      extras.mainPostName = row.postName;
    }
  }

  return map;
}

/** 通讯录条目视图（与 openapi.yaml DirectoryEntry 对齐） */
export type DirectoryEntryView = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  employeeNo: string | null;
  deptId: string | null;
  deptPath: string | null;
  mainPostId: string | null;
  mainPostName: string | null;
  phone: string | null;
  email: string | null;
  entryDate: string | null;
  /** 存量 employment_status 为 NULL 的按在职输出 */
  employmentStatus: 'employed' | 'resigned';
};

export function normalizeEmploymentStatus(
  value: string | null,
): 'employed' | 'resigned' {
  return value === 'resigned' ? 'resigned' : 'employed';
}

/** 通讯录条目映射（users 行 + extras → DirectoryEntry 视图；岗位成员穿透共用） */
export function toDirectoryEntryView(
  row: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    employeeNo: string | null;
    phone: string | null;
    email: string | null;
    entryDate: string | null;
    employmentStatus: string | null;
  },
  extras?: DirectoryExtras,
): DirectoryEntryView {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatar: row.avatar,
    employeeNo: row.employeeNo,
    deptId: extras?.deptId ?? null,
    deptPath: extras?.deptPath ?? null,
    mainPostId: extras?.mainPostId ?? null,
    mainPostName: extras?.mainPostName ?? null,
    phone: row.phone,
    email: row.email,
    entryDate: row.entryDate,
    employmentStatus: normalizeEmploymentStatus(row.employmentStatus),
  };
}

/**
 * 校验公告发布范围目标：dept / post / user 三类目标须存在（未删除），
 * 无效时抛 VALIDATION_ERROR（对齐 assertValidRoleIds 风格）。
 */
export async function assertScopeTargets(
  scopes: { scopeType: string; targetId: string }[],
) {
  if (scopes.length === 0) return;
  const deptIds = scopes.filter((s) => s.scopeType === 'dept').map((s) => s.targetId);
  const postIds = scopes.filter((s) => s.scopeType === 'post').map((s) => s.targetId);
  const userIds = scopes.filter((s) => s.scopeType === 'user').map((s) => s.targetId);
  const invalid: string[] = [];

  if (deptIds.length > 0) {
    const rows = await db
      .select({ id: depts.id })
      .from(depts)
      .where(and(isNull(depts.deletedAt), inArray(depts.id, deptIds)));
    const valid = new Set(rows.map((r) => r.id));
    invalid.push(...deptIds.filter((id) => !valid.has(id)).map((id) => `组织:${id}`));
  }
  if (postIds.length > 0) {
    const rows = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(isNull(posts.deletedAt), inArray(posts.id, postIds)));
    const valid = new Set(rows.map((r) => r.id));
    invalid.push(...postIds.filter((id) => !valid.has(id)).map((id) => `岗位:${id}`));
  }
  if (userIds.length > 0) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), inArray(users.id, userIds)));
    const valid = new Set(rows.map((r) => r.id));
    invalid.push(...userIds.filter((id) => !valid.has(id)).map((id) => `人员:${id}`));
  }

  if (invalid.length > 0) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `发布范围目标不存在: ${invalid.join(', ')}`,
    });
  }
}

/**
 * 解析公告发布范围内的全部用户 ID（三粒度并集去重，仅未删除用户）：
 * - dept：组织及其全部下级组织（递归）内的用户；
 * - post：关联该岗位（user_posts）的用户；
 * - user：直接指定的用户。
 * 用于可见性校验、范围总人数统计与新公告通知写入。
 */
export async function resolveScopeUserIds(
  scopes: { scopeType: string; targetId: string }[],
): Promise<string[]> {
  const collected = new Set<string>();

  const deptIds = scopes.filter((s) => s.scopeType === 'dept').map((s) => s.targetId);
  const postIds = scopes.filter((s) => s.scopeType === 'post').map((s) => s.targetId);
  const userIds = scopes.filter((s) => s.scopeType === 'user').map((s) => s.targetId);

  if (deptIds.length > 0) {
    const subtreeIds = new Set<string>();
    for (const deptId of deptIds) {
      for (const id of await collectDeptSubtreeIds(deptId)) subtreeIds.add(id);
    }
    if (subtreeIds.size > 0) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            inArray(users.deptId, [...subtreeIds]),
          ),
        );
      for (const r of rows) collected.add(r.id);
    }
  }

  if (postIds.length > 0) {
    const rows = await db
      .select({ id: users.id })
      .from(userPosts)
      .innerJoin(
        users,
        and(eq(userPosts.userId, users.id), isNull(users.deletedAt)),
      )
      .where(inArray(userPosts.postId, postIds));
    for (const r of rows) collected.add(r.id);
  }

  if (userIds.length > 0) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), inArray(users.id, userIds)));
    for (const r of rows) collected.add(r.id);
  }

  return [...collected];
}
