import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import { depts, logs, posts, userPosts, users } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 岗位管理服务（与 nest/src/modules/org/posts.service.ts + org-views.ts 对齐）。
 *
 * - 岗位仅作组织数据，不参与权限聚合；
 * - 同一组织下岗位名称未删除间唯一（409 POST_NAME_EXISTS）；
 * - 删除校验在职人员（409 POST_HAS_ACTIVE_USERS，message 携带人数）；
 * - deptId 筛选含所选组织的全部下级组织岗位（递归 CTE）。
 */

/** 对外返回的岗位视图（含所属组织路径与在职人数，与契约 Post 对齐） */
export interface PostView {
  id: string;
  deptId: string;
  deptPath: string;
  name: string;
  category: string;
  rank: string;
  status: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

const SORTABLE = new Set([
  "name",
  "category",
  "rank",
  "status",
  "createdAt",
  "updatedAt",
]);

/** 在职条件：未删除且未离职（employment_status 为 null 的存量数据视为在职） */
const employedUserFilter = and(
  isNull(users.deletedAt),
  or(isNull(users.employmentStatus), ne(users.employmentStatus, "resigned")),
);

/** 全量未删组织的 deptId → 完整路径映射（祖先链 name 以 "/" 连接）。 */
async function buildDeptPathMap(): Promise<Map<string, string>> {
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
      segments.unshift(nameMap.get(cursor) ?? "");
      cursor = parentMap.get(cursor) ?? null;
    }
    const path = segments.join("/");

    for (const segId of seen) pathMap.set(segId, path);

    return path;
  };

  for (const row of rows) buildPath(row.id);

  return pathMap;
}

/** 收集组织及其全部下级组织 ID（未删除；递归 CTE，与 Nest 端一致）。 */
async function collectDeptSubtreeIds(deptId: string): Promise<string[]> {
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

  return (result as unknown as { id: string }[]).map((row) => row.id);
}

/** 校验所属组织：存在、未删除且启用（停用组织不可关联新数据）。 */
async function assertValidDeptId(deptId: string): Promise<void> {
  const row = await db.query.depts.findFirst({
    where: and(eq(depts.id, deptId), isNull(depts.deletedAt)),
  });

  if (!row || row.status !== "enabled") {
    throw new ServerApiError(400, "DEPT_NOT_FOUND", "所属组织不存在或已停用");
  }
}

/** 唯一冲突 → 409（同一组织下岗位名称未删除间唯一）。 */
function handleUniqueError(error: unknown): never {
  const err = error as {
    constraint_name?: string;
    constraint?: string;
    cause?: { constraint?: string; constraint_name?: string };
  };
  const constraint =
    err?.constraint_name ??
    err?.constraint ??
    err?.cause?.constraint_name ??
    "";

  if (constraint.includes("posts_dept_name_unique")) {
    throw new ServerApiError(409, "POST_NAME_EXISTS", "该组织下岗位名称已存在");
  }

  throw new ServerApiError(500, "INTERNAL_ERROR", "服务器内部错误");
}

async function writeLog(
  action: string,
  operatorId: string | null,
  detail?: unknown,
): Promise<void> {
  try {
    await db.insert(logs).values({
      id: generateRecordId(),
      type: "operation",
      userId: operatorId,
      action,
      detail: detail === undefined ? null : detail,
    });
  } catch (err) {
    console.error("[posts] 写入日志失败:", err);
  }
}

function toView(
  row: typeof posts.$inferSelect,
  deptPath: string,
  userCount: number,
): PostView {
  return {
    id: row.id,
    deptId: row.deptId,
    deptPath,
    name: row.name,
    category: row.category,
    rank: row.rank,
    status: row.status,
    userCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** 批量统计岗位在职人数（user_posts → users 未删且在职），避免 N+1。 */
async function loadUserCounts(postIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  if (postIds.length === 0) return map;

  const rows = await db
    .select({ postId: userPosts.postId, total: count() })
    .from(userPosts)
    .innerJoin(users, and(eq(userPosts.userId, users.id), employedUserFilter))
    .where(inArray(userPosts.postId, postIds))
    .groupBy(userPosts.postId);

  for (const row of rows) map.set(row.postId, Number(row.total));

  return map;
}

export interface PostListParams {
  page?: number;
  pageSize?: number;
  deptId?: string;
  keyword?: string;
  category?: string;
  status?: string;
  sort?: string;
  order?: string;
}

/** GET /org/posts — 分页列表（deptId 含下级组织；keyword/category/status 筛选）。 */
export async function listPosts(params: PostListParams): Promise<{
  data: PostView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  const conditions = [isNull(posts.deletedAt)];

  if (params.deptId) {
    const subtreeIds = await collectDeptSubtreeIds(params.deptId);

    conditions.push(inArray(posts.deptId, subtreeIds));
  }
  if (params.keyword) {
    conditions.push(ilike(posts.name, `%${params.keyword.trim()}%`));
  }
  if (params.category) {
    conditions.push(eq(posts.category, params.category));
  }
  if (params.status) {
    conditions.push(eq(posts.status, params.status));
  }

  const where = and(...conditions);

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(posts)
    .where(where);

  // 排序白名单避免注入；默认创建时间降序
  const sortCol =
    params.sort && SORTABLE.has(params.sort) ? params.sort : "createdAt";
  const dir = params.order === "asc" ? asc : desc;
  const orderBy = dir(
    posts[sortCol as "name" | "category" | "rank" | "status"],
  );

  const rows = await db
    .select()
    .from(posts)
    .where(where)
    .orderBy(orderBy, asc(posts.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [deptPathMap, userCountMap] = await Promise.all([
    buildDeptPathMap(),
    loadUserCounts(rows.map((r) => r.id)),
  ]);

  return {
    data: rows.map((row) =>
      toView(
        row,
        deptPathMap.get(row.deptId) ?? "",
        userCountMap.get(row.id) ?? 0,
      ),
    ),
    pagination: { page, pageSize, total },
  };
}

/** GET /org/posts/:id — 详情。 */
export async function findPost(id: string): Promise<PostView> {
  const row = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  });

  if (!row) {
    throw new ServerApiError(404, "POST_NOT_FOUND", "岗位不存在");
  }

  const [deptPathMap, userCountMap] = await Promise.all([
    buildDeptPathMap(),
    loadUserCounts([id]),
  ]);

  return toView(
    row,
    deptPathMap.get(row.deptId) ?? "",
    userCountMap.get(id) ?? 0,
  );
}

export interface PostCreateInput {
  name: string;
  deptId: string;
  category: string;
  rank?: string;
  status?: string;
}

/** POST /org/posts — 创建（所属组织校验；名称同组织唯一）。 */
export async function createPost(
  dto: PostCreateInput,
  operatorId: string | null,
): Promise<PostView> {
  await assertValidDeptId(dto.deptId);

  let row: typeof posts.$inferSelect;

  try {
    const inserted = await db
      .insert(posts)
      .values({
        id: generateRecordId(),
        name: dto.name,
        deptId: dto.deptId,
        category: dto.category,
        rank: dto.rank ?? "",
        status: dto.status ?? "enabled",
      })
      .returning();

    row = inserted[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("post.create", operatorId, {
    id: row.id,
    name: row.name,
    deptId: row.deptId,
  });

  return findPost(row.id);
}

export interface PostUpdateInput {
  name?: string;
  deptId?: string;
  category?: string;
  rank?: string;
  status?: string;
}

/** PUT /org/posts/:id — 更新（deptId 变更时校验所属组织）。 */
export async function updatePost(
  id: string,
  dto: PostUpdateInput,
  operatorId: string | null,
): Promise<PostView> {
  const existing = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "POST_NOT_FOUND", "岗位不存在");
  }

  if (dto.deptId !== undefined && dto.deptId !== existing.deptId) {
    await assertValidDeptId(dto.deptId);
  }

  let row: typeof posts.$inferSelect;

  try {
    const updated = await db
      .update(posts)
      .set({
        name: dto.name ?? existing.name,
        deptId: dto.deptId ?? existing.deptId,
        category: dto.category ?? existing.category,
        rank: dto.rank === undefined ? existing.rank : dto.rank,
        status: dto.status ?? existing.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id))
      .returning();

    row = updated[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("post.update", operatorId, {
    id,
    deptId: row.deptId,
    status: row.status,
  });

  return findPost(id);
}

/**
 * 删除岗位（软删）。校验在职人员：存在 → 409 POST_HAS_ACTIVE_USERS（message 携带人数）。
 * 通过后软删除并同步清理该岗位的 user_post 关联（事务原子）。
 */
export async function removePost(
  id: string,
  operatorId: string | null,
): Promise<null> {
  const existing = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "POST_NOT_FOUND", "岗位不存在");
  }

  const userCountMap = await loadUserCounts([id]);
  const userCount = userCountMap.get(id) ?? 0;

  if (userCount > 0) {
    throw new ServerApiError(
      409,
      "POST_HAS_ACTIVE_USERS",
      `该岗位下存在 ${userCount} 名在职人员，请先调岗或离职处理`,
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(posts)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(posts.id, id));
    // 同步清理关联记录（岗位软删不触发数据库级联）
    await tx.delete(userPosts).where(eq(userPosts.postId, id));
  });

  await writeLog("post.delete", operatorId, { id, name: existing.name });

  return null;
}

/* ---------------------------------------------------------------------------
 * 通讯录条目（/org/posts/:id/members 在职人数穿透）
 * ------------------------------------------------------------------------- */

interface DirectoryExtras {
  deptId: string | null;
  deptPath: string | null;
  mainPostId: string | null;
  mainPostName: string | null;
}

/**
 * 批量装载通讯录摘要：userId → { deptId, deptPath, mainPostId, mainPostName }。
 * deptPath 依赖全量组织路径映射；主岗取 user_posts.is_main 的那条。
 */
async function loadDirectoryExtras(
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
    extras.deptPath = extras.deptId
      ? (deptPathMap.get(extras.deptId) ?? null)
      : null;
  }

  // 主岗联查（user_posts is_main → posts，岗位未删除才算主岗有效）
  const mainRows = await db
    .select({
      userId: userPosts.userId,
      postId: posts.id,
      postName: posts.name,
    })
    .from(userPosts)
    .innerJoin(
      posts,
      and(eq(userPosts.postId, posts.id), isNull(posts.deletedAt)),
    )
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

/** 通讯录条目视图（与契约 DirectoryEntry 对齐） */
export interface DirectoryEntryView {
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
  employmentStatus: "employed" | "resigned";
}

function toDirectoryEntryView(
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
    employmentStatus:
      row.employmentStatus === "resigned" ? "resigned" : "employed",
  };
}

/** GET /org/posts/:id/members — 在职人数穿透（分页；仅在职且未删除用户）。 */
export async function listPostMembers(
  id: string,
  params: { page?: number; pageSize?: number },
): Promise<{
  data: DirectoryEntryView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  });

  if (!post) {
    throw new ServerApiError(404, "POST_NOT_FOUND", "岗位不存在");
  }

  const where = eq(userPosts.postId, id);

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(userPosts)
    .innerJoin(users, and(eq(userPosts.userId, users.id), employedUserFilter))
    .where(where);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      employeeNo: users.employeeNo,
      phone: users.phone,
      email: users.email,
      entryDate: users.entryDate,
      employmentStatus: users.employmentStatus,
    })
    .from(userPosts)
    .innerJoin(users, and(eq(userPosts.userId, users.id), employedUserFilter))
    .where(where)
    .orderBy(asc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const extrasMap = await loadDirectoryExtras(rows.map((r) => r.id));

  return {
    data: rows.map((row) => toDirectoryEntryView(row, extrasMap.get(row.id))),
    pagination: { page, pageSize, total },
  };
}

/* ---------------------------------------------------------------------------
 * 人员通讯录（契约 v1.6.0，GET /org/directory）
 * ------------------------------------------------------------------------- */

export interface DirectoryListParams {
  page?: number;
  pageSize?: number;
  deptId?: string;
  keyword?: string;
  employmentStatus?: string;
  sort?: string;
  order?: string;
}

const DIRECTORY_SORTABLE = new Set([
  "username",
  "displayName",
  "employeeNo",
  "entryDate",
  "employmentStatus",
  "createdAt",
]);

/**
 * GET /org/directory — 人员通讯录（全员视图实时联查，无缓存延迟）。
 *
 * - 组织筛选含所选组织的全部下级组织人员（递归 CTE）；
 * - 在职状态缺省 employed（离职人员默认不展示，PRD 3.3.5）；
 *   employment_status 为 NULL 的存量数据按在职处理；
 * - 关键词命中 displayName / employeeNo / username（模糊）。
 */
export async function listDirectory(params: DirectoryListParams): Promise<{
  data: DirectoryEntryView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  const conditions = [isNull(users.deletedAt)];

  switch (params.employmentStatus) {
    case "resigned":
      conditions.push(eq(users.employmentStatus, "resigned"));
      break;
    case "all":
      break;
    // 缺省 employed：显式在职或存量 NULL
    default:
      conditions.push(
        or(
          isNull(users.employmentStatus),
          eq(users.employmentStatus, "employed"),
        )!,
      );
      break;
  }

  if (params.deptId) {
    const subtreeIds = await collectDeptSubtreeIds(params.deptId);

    conditions.push(inArray(users.deptId, subtreeIds));
  }

  const normalizedKeyword = params.keyword?.trim();

  if (normalizedKeyword) {
    const pattern = `%${normalizedKeyword}%`;

    conditions.push(
      or(
        ilike(users.displayName, pattern),
        ilike(users.employeeNo, pattern),
        ilike(users.username, pattern),
      )!,
    );
  }

  const where = and(...conditions);

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(users)
    .where(where);

  // 排序白名单避免注入；默认创建时间降序
  const sortCol =
    params.sort && DIRECTORY_SORTABLE.has(params.sort)
      ? params.sort
      : "createdAt";
  const dir = params.order === "asc" ? asc : desc;
  const orderBy = dir(
    users[sortCol as "username" | "displayName" | "employeeNo" | "entryDate"],
  );

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      employeeNo: users.employeeNo,
      phone: users.phone,
      email: users.email,
      entryDate: users.entryDate,
      employmentStatus: users.employmentStatus,
    })
    .from(users)
    .where(where)
    .orderBy(orderBy, asc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const extrasMap = await loadDirectoryExtras(rows.map((r) => r.id));

  return {
    data: rows.map((row) => toDirectoryEntryView(row, extrasMap.get(row.id))),
    pagination: { page, pageSize, total },
  };
}
