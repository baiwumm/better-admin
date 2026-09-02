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
} from "drizzle-orm";

import { db } from "@/db/client";
import { depts, logs, posts, users } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 组织管理服务（与 nest/src/modules/org/depts.service.ts 一一对齐）。
 * 冻结契约范围：depts 全量树 + 分页列表 + CRUD + 拖拽排序；
 * 岗位（posts）仅用于删除占用检查与计数（表已建，业务在后续阶段）。
 */

/** 对外返回的组织视图（含联查摘要，与契约 Dept schema 对齐） */
export interface DeptView {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leaderId: string | null;
  /** 负责人姓名（left join 未删除 users.display_name） */
  leaderName: string | null;
  sort: number;
  status: string;
  childCount: number;
  postCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 组织树节点（与契约 DeptTreeNode 对齐；leaderId 供编辑弹窗回显负责人） */
export interface DeptTreeNodeView {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leaderId: string | null;
  leaderName: string | null;
  sort: number;
  status: string;
  children: DeptTreeNodeView[];
}

type DeptRow = {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leaderId: string | null;
  leaderName: string | null;
  sort: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const SORTABLE = new Set([
  "name",
  "code",
  "sort",
  "status",
  "createdAt",
  "updatedAt",
]);

/** 在职条件：未删除且未离职（employment_status 为 null 的存量数据视为在职） */
const employedUserCondition = and(
  isNull(users.deletedAt),
  or(isNull(users.employmentStatus), ne(users.employmentStatus, "resigned")),
);

function toView(row: DeptRow, counts?: Partial<DeptView>): DeptView {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    code: row.code,
    leaderId: row.leaderId,
    leaderName: row.leaderName,
    sort: row.sort,
    status: row.status,
    childCount: counts?.childCount ?? 0,
    postCount: counts?.postCount ?? 0,
    userCount: counts?.userCount ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** 唯一冲突 → 409（postgres.js 的 pg 错误字段为 constraint_name）。 */
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

  if (constraint.includes("depts_name_unique")) {
    throw new ServerApiError(409, "DEPT_NAME_EXISTS", "组织名称已存在");
  }
  if (constraint.includes("depts_code_unique")) {
    throw new ServerApiError(409, "DEPT_CODE_EXISTS", "组织编码已存在");
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
    console.error("[depts] 写入日志失败:", err);
  }
}

/** 仅查询未软删组织的共用基础行（含负责人姓名联查）。 */
function baseSelect() {
  return db
    .select({
      id: depts.id,
      parentId: depts.parentId,
      name: depts.name,
      code: depts.code,
      leaderId: depts.leaderId,
      leaderName: users.displayName,
      sort: depts.sort,
      status: depts.status,
      createdAt: depts.createdAt,
      updatedAt: depts.updatedAt,
    })
    .from(depts)
    .leftJoin(
      users,
      and(eq(depts.leaderId, users.id), isNull(users.deletedAt)),
    );
}

/**
 * 批量统计 childCount / postCount / userCount，
 * 返回 Map<deptId, counts>。三条 group by 聚合，避免逐行 N+1。
 */
async function loadCounts(ids: string[]) {
  const map = new Map<
    string,
    { childCount: number; postCount: number; userCount: number }
  >();

  if (ids.length === 0) return map;

  for (const id of ids) {
    map.set(id, { childCount: 0, postCount: 0, userCount: 0 });
  }

  const childRows = await db
    .select({ parentId: depts.parentId, total: count() })
    .from(depts)
    .where(and(isNull(depts.deletedAt), inArray(depts.parentId, ids)))
    .groupBy(depts.parentId);
  const postRows = await db
    .select({ deptId: posts.deptId, total: count() })
    .from(posts)
    .where(and(isNull(posts.deletedAt), inArray(posts.deptId, ids)))
    .groupBy(posts.deptId);
  const userRows = await db
    .select({ deptId: users.deptId, total: count() })
    .from(users)
    .where(and(employedUserCondition, inArray(users.deptId, ids)))
    .groupBy(users.deptId);

  for (const r of childRows) {
    if (r.parentId) {
      const c = map.get(r.parentId);

      if (c) c.childCount = Number(r.total);
    }
  }
  for (const r of postRows) {
    if (r.deptId) {
      const c = map.get(r.deptId);

      if (c) c.postCount = Number(r.total);
    }
  }
  for (const r of userRows) {
    if (r.deptId) {
      const c = map.get(r.deptId);

      if (c) c.userCount = Number(r.total);
    }
  }

  return map;
}

/** 校验父级组织：存在、未删除且启用（顶级 null 直接通过）。 */
async function assertValidParent(
  parentId: string | null | undefined,
): Promise<void> {
  if (!parentId) return;

  const row = await db.query.depts.findFirst({
    where: and(eq(depts.id, parentId), isNull(depts.deletedAt)),
  });

  if (!row || row.status !== "enabled") {
    throw new ServerApiError(
      400,
      "DEPT_PARENT_INVALID",
      "上级组织不存在或已停用",
    );
  }
}

/** 校验负责人用户存在且未删除。 */
async function assertValidLeader(
  leaderId: string | null | undefined,
): Promise<void> {
  if (!leaderId) return;

  const row = await db.query.users.findFirst({
    where: and(eq(users.id, leaderId), isNull(users.deletedAt)),
  });

  if (!row) {
    throw new ServerApiError(400, "USER_NOT_FOUND", "负责人不存在");
  }
}

/**
 * 防环校验：目标父级不得为自身或自身的后代组织。
 * 从新 parentId 沿 parent 链向上走，回到自身即成环。
 */
async function assertNotSelfDescendant(
  id: string,
  parentId: string | null,
): Promise<void> {
  if (!parentId) return;

  if (parentId === id) {
    throw new ServerApiError(
      400,
      "DEPT_PARENT_INVALID",
      "上级组织不合法（不可移动到自身或自身下级组织下）",
    );
  }

  const rows = await db
    .select({ id: depts.id, parentId: depts.parentId })
    .from(depts)
    .where(isNull(depts.deletedAt));
  const parentMap = new Map(rows.map((r) => [r.id, r.parentId]));
  let cursor: string | null | undefined = parentId;
  const seen = new Set<string>();

  while (cursor && !seen.has(cursor)) {
    if (cursor === id) {
      throw new ServerApiError(
        400,
        "DEPT_PARENT_INVALID",
        "上级组织不合法（不可移动到自身或自身下级组织下）",
      );
    }
    seen.add(cursor);
    cursor = parentMap.get(cursor) ?? null;
  }
}

/** 组织树（全量，未删除，含停用组织；同级按 sort 降序、createdAt 升序稳定排序）。 */
export async function findDeptTree(): Promise<DeptTreeNodeView[]> {
  const rows = await baseSelect()
    .where(isNull(depts.deletedAt))
    .orderBy(desc(depts.sort), asc(depts.createdAt));

  const childrenMap = new Map<string | null, DeptRow[]>();

  for (const row of rows) {
    const key = row.parentId ?? null;
    const list = childrenMap.get(key) ?? [];

    list.push(row as DeptRow);
    childrenMap.set(key, list);
  }

  const build = (parentId: string | null): DeptTreeNodeView[] => {
    const list = childrenMap.get(parentId) ?? [];

    return list.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      code: row.code,
      leaderId: row.leaderId,
      leaderName: row.leaderName,
      sort: row.sort,
      status: row.status,
      children: build(row.id),
    }));
  };

  return build(null);
}

export interface DeptListParams {
  page?: number;
  pageSize?: number;
  parentId?: string;
  status?: string;
  keyword?: string;
  sort?: string;
  order?: string;
}

/** GET /org/depts — 分页列表（parentId/status/keyword 筛选；默认同级 sort 降序）。 */
export async function listDepts(params: DeptListParams): Promise<{
  data: DeptView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  const conditions = [isNull(depts.deletedAt)];

  if (params.parentId) {
    conditions.push(eq(depts.parentId, params.parentId));
  }
  if (params.status) {
    conditions.push(eq(depts.status, params.status));
  }

  const normalizedKeyword = params.keyword?.trim();

  if (normalizedKeyword) {
    const pattern = `%${normalizedKeyword}%`;

    conditions.push(
      or(ilike(depts.name, pattern), ilike(depts.code, pattern))!,
    );
  }

  const where = and(...conditions);

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(depts)
    .where(where);

  // 排序白名单避免注入；默认同级排序号降序（数字越大越靠前）
  const sortCol =
    params.sort && SORTABLE.has(params.sort) ? params.sort : "sort";
  const dir = params.order === "asc" ? asc : desc;
  const orderBy = dir(depts[sortCol as "sort" | "name" | "code" | "status"]);

  const rows = await baseSelect()
    .where(where)
    .orderBy(orderBy, asc(depts.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const countsMap = await loadCounts(rows.map((r) => r.id));

  return {
    data: rows.map((row) => toView(row as DeptRow, countsMap.get(row.id))),
    pagination: { page, pageSize, total },
  };
}

/** GET /org/depts/:id — 详情（含 childCount/postCount/userCount）。 */
export async function findDept(id: string): Promise<DeptView> {
  const [row] = await baseSelect().where(
    and(eq(depts.id, id), isNull(depts.deletedAt)),
  );

  if (!row) {
    throw new ServerApiError(404, "DEPT_NOT_FOUND", "组织不存在");
  }

  const countsMap = await loadCounts([id]);

  return toView(row as DeptRow, countsMap.get(id));
}

export interface DeptCreateInput {
  name: string;
  code?: string | null;
  parentId?: string | null;
  leaderId?: string | null;
  sort?: number;
  status?: string;
}

/** POST /org/depts — 创建（父级/负责人校验；name/code 唯一）。 */
export async function createDept(
  dto: DeptCreateInput,
  operatorId: string | null,
): Promise<DeptView> {
  await assertValidParent(dto.parentId ?? null);
  await assertValidLeader(dto.leaderId);

  let row: typeof depts.$inferSelect;

  try {
    const inserted = await db
      .insert(depts)
      .values({
        id: generateRecordId(),
        name: dto.name,
        code: dto.code ?? null,
        parentId: dto.parentId ?? null,
        leaderId: dto.leaderId ?? null,
        sort: dto.sort ?? 0,
        status: dto.status ?? "enabled",
      })
      .returning();

    row = inserted[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("dept.create", operatorId, {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
  });

  return findDept(row.id);
}

export interface DeptUpdateInput {
  name?: string;
  code?: string | null;
  /** 语义：undefined = 不修改；null = 移动为顶级；非 null = 移动到该组织下 */
  parentId?: string | null;
  leaderId?: string | null;
  sort?: number;
  status?: string;
}

/** PUT /org/depts/:id — 更新（移动组织防环 + 父级/负责人校验）。 */
export async function updateDept(
  id: string,
  dto: DeptUpdateInput,
  operatorId: string | null,
): Promise<DeptView> {
  const existing = await db.query.depts.findFirst({
    where: and(eq(depts.id, id), isNull(depts.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "DEPT_NOT_FOUND", "组织不存在");
  }

  // parentId 语义：undefined = 不修改；null = 移动为顶级；非 null = 移动到该组织下
  if (
    dto.parentId !== undefined &&
    dto.parentId !== (existing.parentId ?? null)
  ) {
    await assertNotSelfDescendant(id, dto.parentId ?? null);
    await assertValidParent(dto.parentId ?? null);
  }
  if (dto.leaderId !== undefined && dto.leaderId !== existing.leaderId) {
    await assertValidLeader(dto.leaderId);
  }

  let row: typeof depts.$inferSelect;

  try {
    const updated = await db
      .update(depts)
      .set({
        name: dto.name ?? existing.name,
        code: dto.code === undefined ? existing.code : dto.code,
        parentId: dto.parentId === undefined ? existing.parentId : dto.parentId,
        leaderId: dto.leaderId === undefined ? existing.leaderId : dto.leaderId,
        sort: dto.sort ?? existing.sort,
        status: dto.status ?? existing.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(depts.id, id))
      .returning();

    row = updated[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("dept.update", operatorId, {
    id,
    parentId: row.parentId,
    status: row.status,
  });

  return findDept(id);
}

/**
 * 删除组织（软删）。三级删除校验按序阻断（契约 v1.6.0）：
 * 1. 存在下级组织 → DEPT_HAS_CHILDREN
 * 2. 存在岗位 → DEPT_HAS_POSTS
 * 3. 存在在职人员 → DEPT_HAS_ACTIVE_USERS
 * 校验通过后软删除（deleted_at 置位）。
 */
export async function removeDept(
  id: string,
  operatorId: string | null,
): Promise<null> {
  const existing = await db.query.depts.findFirst({
    where: and(eq(depts.id, id), isNull(depts.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "DEPT_NOT_FOUND", "组织不存在");
  }

  const [childRow] = await db
    .select({ total: count() })
    .from(depts)
    .where(and(isNull(depts.deletedAt), eq(depts.parentId, id)));

  if (Number(childRow.total) > 0) {
    throw new ServerApiError(
      409,
      "DEPT_HAS_CHILDREN",
      "该组织下存在下级组织，请先删除下级组织",
    );
  }

  const [postRow] = await db
    .select({ total: count() })
    .from(posts)
    .where(and(isNull(posts.deletedAt), eq(posts.deptId, id)));

  if (Number(postRow.total) > 0) {
    throw new ServerApiError(
      409,
      "DEPT_HAS_POSTS",
      "该组织下存在岗位，请先移除该组织下的岗位",
    );
  }

  const [userRow] = await db
    .select({ total: count() })
    .from(users)
    .where(and(employedUserCondition, eq(users.deptId, id)));

  if (Number(userRow.total) > 0) {
    throw new ServerApiError(
      409,
      "DEPT_HAS_ACTIVE_USERS",
      "该组织下存在在职人员，请先调岗或离职处理",
    );
  }

  await db
    .update(depts)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(depts.id, id));

  await writeLog("dept.delete", operatorId, { id, name: existing.name });

  return null;
}

export interface DeptSortItem {
  id: string;
  parentId?: string | null;
  sort?: number;
}

/**
 * 拖拽排序（同级调序 / 跨级移动）。事务内整批落库：
 * 任一 id 无效整体拒绝（INVALID_OPERATION）；批量内父子关系按
 * 「应用全部变更后」的最终状态做环检测，防止 A→B、B→A 的组合环。
 */
export async function sortDepts(
  items: DeptSortItem[],
  operatorId: string | null,
): Promise<null> {
  const ids = items.map((item) => item.id);
  const uniqueIds = new Set(ids);

  if (uniqueIds.size !== ids.length) {
    throw new ServerApiError(
      400,
      "INVALID_OPERATION",
      "排序项中存在重复的组织 ID",
    );
  }

  const rows = await db
    .select({ id: depts.id, parentId: depts.parentId })
    .from(depts)
    .where(and(isNull(depts.deletedAt), inArray(depts.id, ids)));
  const existingMap = new Map(rows.map((r) => [r.id, r.parentId]));
  const invalid = ids.filter((id) => !existingMap.has(id));

  if (invalid.length > 0) {
    throw new ServerApiError(400, "INVALID_OPERATION", "部分组织 ID 无效");
  }

  // 批量内父级有效性：非 null 的目标父级须存在且未删除（停用组织不可作为新父级）
  const parentTargets = items
    .map((item) => item.parentId ?? null)
    .filter((p): p is string => !!p);

  if (parentTargets.length > 0) {
    const validParents = await db
      .select({ id: depts.id, status: depts.status })
      .from(depts)
      .where(and(isNull(depts.deletedAt), inArray(depts.id, parentTargets)));
    const validMap = new Map(validParents.map((r) => [r.id, r.status]));

    for (const p of parentTargets) {
      if (validMap.get(p) !== "enabled") {
        throw new ServerApiError(
          400,
          "DEPT_PARENT_INVALID",
          "目标上级组织不合法",
        );
      }
    }
  }

  // 环检测：以现有全局父子关系为底，应用本批 parentId 变更后逐节点走链
  const finalParentMap = new Map<string, string | null>();
  const allRows = await db
    .select({ id: depts.id, parentId: depts.parentId })
    .from(depts)
    .where(isNull(depts.deletedAt));

  for (const r of allRows) finalParentMap.set(r.id, r.parentId);

  for (const item of items) {
    finalParentMap.set(item.id, item.parentId ?? null);
  }

  for (const item of items) {
    let cursor: string | null | undefined = item.parentId ?? null;
    const seen = new Set<string>();

    while (cursor && !seen.has(cursor)) {
      if (cursor === item.id) {
        throw new ServerApiError(
          400,
          "DEPT_PARENT_INVALID",
          "目标上级组织不合法（批量移动形成循环层级）",
        );
      }
      seen.add(cursor);
      cursor = finalParentMap.get(cursor) ?? null;
    }
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(depts)
        .set({
          parentId: item.parentId ?? null,
          sort: item.sort ?? 0,
        })
        .where(eq(depts.id, item.id));
    }
  });

  await writeLog("dept.sort", operatorId, { items });

  return null;
}
