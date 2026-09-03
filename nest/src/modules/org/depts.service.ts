import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '../../db/client';
import { depts, users, posts, logs } from '../../db/schema';
import { DeptCreateDto } from './dto/dept-create.dto';
import { DeptUpdateDto } from './dto/dept-update.dto';
import { DeptQueryDto } from './dto/dept-query.dto';
import { DeptSortDto } from './dto/dept-sort.dto';

/** 对外返回的组织视图（含联查摘要，与 openapi.yaml Dept schema 对齐） */
export type DeptView = {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leaderId: string | null;
  /** 负责人姓名（left join 未删除 users.display_name） */
  leaderName: string | null;
  /** 负责人头像 URL（契约 v1.7.0：图谱卡片展示用） */
  leaderAvatar: string | null;
  sort: number;
  status: string;
  childCount: number;
  postCount: number;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/** 组织树节点（与 openapi.yaml DeptTreeNode 对齐；leaderId 供编辑弹窗回显负责人） */
export type DeptTreeNodeView = {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leaderId: string | null;
  leaderName: string | null;
  /** 负责人头像 URL（契约 v1.7.0：图谱卡片展示用） */
  leaderAvatar: string | null;
  sort: number;
  status: string;
  children: DeptTreeNodeView[];
};

/** baseSelect 行结构（未选取 deletedAt；insert/update returning 行可经 findOne 重查归一） */
type DeptRow = {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leaderId: string | null;
  leaderName: string | null;
  leaderAvatar: string | null;
  sort: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

const SORTABLE = new Set([
  'name',
  'code',
  'sort',
  'status',
  'createdAt',
  'updatedAt',
]);

/** 在职条件：未删除且未离职（employment_status 为 null 的存量数据视为在职） */
const employedUserCondition = and(
  isNull(users.deletedAt),
  or(isNull(users.employmentStatus), ne(users.employmentStatus, 'resigned')),
);

function toView(row: DeptRow, counts?: Partial<DeptView>): DeptView {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    code: row.code,
    leaderId: row.leaderId,
    leaderName: row.leaderName,
    leaderAvatar: row.leaderAvatar,
    sort: row.sort,
    status: row.status,
    childCount: counts?.childCount ?? 0,
    postCount: counts?.postCount ?? 0,
    userCount: counts?.userCount ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class DeptsService {
  /** 捕获唯一索引冲突，转换为业务 409 错误（对齐 users.service.handleUniqueError） */
  private handleUniqueError(err: any): never {
    const constraint: string = err?.constraint ?? err?.cause?.constraint ?? '';
    if (constraint.includes('depts_name_unique')) {
      throw new ConflictException({
        code: 'DEPT_NAME_EXISTS',
        message: '组织名称已存在',
      });
    }
    if (constraint.includes('depts_code_unique')) {
      throw new ConflictException({
        code: 'DEPT_CODE_EXISTS',
        message: '组织编码已存在',
      });
    }
    throw err;
  }

  private async writeLog(
    action: string,
    operatorId: string | null,
    detail?: unknown,
  ) {
    try {
      await db.insert(logs).values({
        type: 'operation',
        action,
        userId: operatorId,
        detail: detail === undefined ? null : (detail as any),
      });
    } catch (err) {
      console.error('[depts] 写入日志失败:', err);
    }
  }

  /** 仅查询未软删组织的共用基础行（含负责人姓名 + 头像联查） */
  private baseSelect() {
    return db
      .select({
        id: depts.id,
        parentId: depts.parentId,
        name: depts.name,
        code: depts.code,
        leaderId: depts.leaderId,
        leaderName: users.displayName,
        leaderAvatar: users.avatar,
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
  private async loadCounts(ids: string[]) {
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

  /** 校验父级组织：存在、未删除且启用（顶级 null 直接通过） */
  private async assertValidParent(parentId: string | null | undefined) {
    if (!parentId) return;
    const row = await db.query.depts.findFirst({
      where: and(eq(depts.id, parentId), isNull(depts.deletedAt)),
    });
    if (!row || row.status !== 'enabled') {
      throw new BadRequestException({
        code: 'DEPT_PARENT_INVALID',
        message: '上级组织不存在或已停用',
      });
    }
  }

  /** 校验负责人用户存在且未删除 */
  private async assertValidLeader(leaderId: string | null | undefined) {
    if (!leaderId) return;
    const row = await db.query.users.findFirst({
      where: and(eq(users.id, leaderId), isNull(users.deletedAt)),
    });
    if (!row) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: '负责人不存在',
      });
    }
  }

  /**
   * 防环校验：目标父级不得为自身或自身的后代组织。
   * 从新 parentId 沿 parent 链向上走，回到自身即成环。
   */
  private async assertNotSelfDescendant(id: string, parentId: string | null) {
    if (!parentId) return;
    if (parentId === id) {
      throw new BadRequestException({
        code: 'DEPT_PARENT_INVALID',
        message: '上级组织不合法（不可移动到自身或自身下级组织下）',
      });
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
        throw new BadRequestException({
          code: 'DEPT_PARENT_INVALID',
          message: '上级组织不合法（不可移动到自身或自身下级组织下）',
        });
      }
      seen.add(cursor);
      cursor = parentMap.get(cursor) ?? null;
    }
  }

  /** 组织树（全量，未删除，含停用组织；同级按 sort 降序、createdAt 升序稳定排序） */
  async findTree(): Promise<DeptTreeNodeView[]> {
    const rows = await this.baseSelect()
      .where(isNull(depts.deletedAt))
      .orderBy(desc(depts.sort), asc(depts.createdAt));

    const childrenMap = new Map<string | null, DeptRow[]>();
    for (const row of rows) {
      const key = row.parentId ?? null;
      const list = childrenMap.get(key) ?? [];
      list.push(row);
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
        leaderAvatar: row.leaderAvatar,
        sort: row.sort,
        status: row.status,
        children: build(row.id),
      }));
    };
    return build(null);
  }

  async findAll(query: DeptQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [isNull(depts.deletedAt)];
    if (query.parentId) {
      conditions.push(eq(depts.parentId, query.parentId));
    }
    if (query.status) {
      conditions.push(eq(depts.status, query.status));
    }
    if (query.keyword) {
      const pattern = `%${query.keyword}%`;
      conditions.push(
        sql`(${depts.name} ILIKE ${pattern} OR ${depts.code} ILIKE ${pattern})`,
      );
    }
    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(depts)
      .where(where);

    // 排序白名单避免注入；默认同级排序号降序（数字越大越靠前）
    const sortCol =
      query.sort && SORTABLE.has(query.sort) ? query.sort : 'sort';
    const dir = query.order === 'asc' ? asc : desc;
    const orderBy = dir((depts as any)[sortCol]);

    const rows = await this.baseSelect()
      .where(where)
      .orderBy(orderBy, asc(depts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const countsMap = await this.loadCounts(rows.map((r) => r.id));

    return {
      data: rows.map((row) =>
        toView(row as DeptRow, countsMap.get(row.id)),
      ),
      pagination: { page, pageSize, total },
    };
  }

  async findOne(id: string): Promise<DeptView> {
    const [row] = await this.baseSelect().where(
      and(eq(depts.id, id), isNull(depts.deletedAt)),
    );
    if (!row) {
      throw new NotFoundException({
        code: 'DEPT_NOT_FOUND',
        message: '组织不存在',
      });
    }
    const countsMap = await this.loadCounts([id]);
    return toView(row as DeptRow, countsMap.get(id));
  }

  async create(dto: DeptCreateDto, operatorId: string | null): Promise<DeptView> {
    await this.assertValidParent(dto.parentId ?? null);
    await this.assertValidLeader(dto.leaderId);

    const [row] = await db
      .insert(depts)
      .values({
        name: dto.name,
        code: dto.code ?? null,
        parentId: dto.parentId ?? null,
        leaderId: dto.leaderId ?? null,
        sort: dto.sort ?? 0,
        status: dto.status ?? 'enabled',
      })
      .returning()
      .catch((err) => this.handleUniqueError(err));

    await this.writeLog('dept.create', operatorId, {
      id: row.id,
      name: row.name,
      parentId: row.parentId,
    });
    return this.findOne(row.id);
  }

  async update(
    id: string,
    dto: DeptUpdateDto,
    operatorId: string | null,
  ): Promise<DeptView> {
    const existing = await db.query.depts.findFirst({
      where: and(eq(depts.id, id), isNull(depts.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'DEPT_NOT_FOUND',
        message: '组织不存在',
      });
    }

    // parentId 语义：undefined = 不修改；null = 移动为顶级；非 null = 移动到该组织下
    if (dto.parentId !== undefined && dto.parentId !== (existing.parentId ?? null)) {
      await this.assertNotSelfDescendant(id, dto.parentId ?? null);
      await this.assertValidParent(dto.parentId ?? null);
    }
    if (dto.leaderId !== undefined && dto.leaderId !== existing.leaderId) {
      await this.assertValidLeader(dto.leaderId);
    }

    const [row] = await db
      .update(depts)
      .set({
        name: dto.name ?? existing.name,
        code: dto.code === undefined ? existing.code : dto.code,
        parentId: dto.parentId === undefined ? existing.parentId : dto.parentId,
        leaderId: dto.leaderId === undefined ? existing.leaderId : dto.leaderId,
        sort: dto.sort ?? existing.sort,
        status: dto.status ?? existing.status,
      })
      .where(eq(depts.id, id))
      .returning()
      .catch((err) => this.handleUniqueError(err));

    await this.writeLog('dept.update', operatorId, {
      id,
      parentId: row.parentId,
      status: row.status,
    });
    return this.findOne(id);
  }

  /**
   * 删除组织（软删）。三级删除校验按序阻断（契约 v1.6.0）：
   * 1. 存在下级组织 → DEPT_HAS_CHILDREN
   * 2. 存在岗位 → DEPT_HAS_POSTS
   * 3. 存在在职人员 → DEPT_HAS_ACTIVE_USERS
   * 校验通过后软删除（deleted_at 置位）。
   */
  async remove(id: string, operatorId: string | null) {
    const existing = await db.query.depts.findFirst({
      where: and(eq(depts.id, id), isNull(depts.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'DEPT_NOT_FOUND',
        message: '组织不存在',
      });
    }

    const [childRow] = await db
      .select({ total: count() })
      .from(depts)
      .where(and(isNull(depts.deletedAt), eq(depts.parentId, id)));
    if (Number(childRow.total) > 0) {
      throw new ConflictException({
        code: 'DEPT_HAS_CHILDREN',
        message: '该组织下存在下级组织，请先删除下级组织',
      });
    }

    const [postRow] = await db
      .select({ total: count() })
      .from(posts)
      .where(and(isNull(posts.deletedAt), eq(posts.deptId, id)));
    if (Number(postRow.total) > 0) {
      throw new ConflictException({
        code: 'DEPT_HAS_POSTS',
        message: '该组织下存在岗位，请先移除该组织下的岗位',
      });
    }

    const [userRow] = await db
      .select({ total: count() })
      .from(users)
      .where(and(employedUserCondition, eq(users.deptId, id)));
    if (Number(userRow.total) > 0) {
      throw new ConflictException({
        code: 'DEPT_HAS_ACTIVE_USERS',
        message: '该组织下存在在职人员，请先调岗或离职处理',
      });
    }

    await db
      .update(depts)
      .set({ deletedAt: new Date() })
      .where(eq(depts.id, id));
    await this.writeLog('dept.delete', operatorId, { id, name: existing.name });
    return null;
  }

  /**
   * 拖拽排序（同级调序 / 跨级移动）。事务内整批落库：
   * 任一 id 无效整体拒绝（INVALID_OPERATION）；批量内父子关系按
   * 「应用全部变更后」的最终状态做环检测，防止 A→B、B→A 的组合环。
   */
  async sort(dto: DeptSortDto, operatorId: string | null) {
    const ids = dto.items.map((item) => item.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '排序项中存在重复的组织 ID',
      });
    }
    const rows = await db
      .select({ id: depts.id, parentId: depts.parentId })
      .from(depts)
      .where(and(isNull(depts.deletedAt), inArray(depts.id, ids)));
    const existingMap = new Map(rows.map((r) => [r.id, r.parentId]));
    const invalid = ids.filter((id) => !existingMap.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '部分组织 ID 无效',
      });
    }

    // 批量内父级有效性：非 null 的目标父级须存在且未删除（停用组织不可作为新父级）
    const parentTargets = dto.items
      .map((item) => item.parentId ?? null)
      .filter((p): p is string => !!p);
    if (parentTargets.length > 0) {
      const validParents = await db
        .select({ id: depts.id, status: depts.status })
        .from(depts)
        .where(
          and(isNull(depts.deletedAt), inArray(depts.id, parentTargets)),
        );
      const validMap = new Map(validParents.map((r) => [r.id, r.status]));
      for (const p of parentTargets) {
        if (validMap.get(p) !== 'enabled') {
          throw new BadRequestException({
            code: 'DEPT_PARENT_INVALID',
            message: '目标上级组织不合法',
          });
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
    for (const item of dto.items) {
      finalParentMap.set(item.id, item.parentId ?? null);
    }
    for (const item of dto.items) {
      let cursor: string | null | undefined = item.parentId ?? null;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        if (cursor === item.id) {
          throw new BadRequestException({
            code: 'DEPT_PARENT_INVALID',
            message: '目标上级组织不合法（批量移动形成循环层级）',
          });
        }
        seen.add(cursor);
        cursor = finalParentMap.get(cursor) ?? null;
      }
    }

    await db.transaction(async (tx) => {
      for (const item of dto.items) {
        await tx
          .update(depts)
          .set({
            parentId: item.parentId ?? null,
            sort: item.sort ?? 0,
          })
          .where(eq(depts.id, item.id));
      }
    });
    await this.writeLog('dept.sort', operatorId, { items: dto.items });
    return null;
  }
}
