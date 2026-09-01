import {
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
  sql,
} from 'drizzle-orm';
import { db } from '../../db/client';
import { posts, users, userPosts, logs } from '../../db/schema';
import {
  DirectoryEntryView,
  assertValidDeptId,
  buildDeptPathMap,
  collectDeptSubtreeIds,
  employedUserFilter,
  loadDirectoryExtras,
  toDirectoryEntryView,
} from './org-views';
import { PostCreateDto } from './dto/post-create.dto';
import { PostUpdateDto } from './dto/post-update.dto';
import { PostQueryDto } from './dto/post-query.dto';

/** 对外返回的岗位视图（含所属组织路径与在职人数，与 openapi.yaml Post 对齐） */
export type PostView = {
  id: string;
  deptId: string;
  deptPath: string;
  name: string;
  category: string;
  rank: string;
  status: string;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const SORTABLE = new Set([
  'name',
  'category',
  'rank',
  'status',
  'createdAt',
  'updatedAt',
]);

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

@Injectable()
export class PostsService {
  /** 捕获唯一索引冲突：同一组织下岗位名称（未删除间） */
  private handleUniqueError(err: any): never {
    const constraint: string = err?.constraint ?? err?.cause?.constraint ?? '';
    if (constraint.includes('posts_dept_name_unique')) {
      throw new ConflictException({
        code: 'POST_NAME_EXISTS',
        message: '该组织下岗位名称已存在',
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
      console.error('[posts] 写入日志失败:', err);
    }
  }

  /** 校验所属组织：存在、未删除且启用（停用组织不可关联新数据；共享 helper） */
  private assertValidDept(deptId: string) {
    return assertValidDeptId(deptId);
  }

  /** 批量统计岗位在职人数（user_posts → users 未删且在职），避免 N+1 */
  private async loadUserCounts(postIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (postIds.length === 0) return map;

    const rows = await db
      .select({ postId: userPosts.postId, total: count() })
      .from(userPosts)
      .innerJoin(
        users,
        and(eq(userPosts.userId, users.id), employedUserFilter),
      )
      .where(inArray(userPosts.postId, postIds))
      .groupBy(userPosts.postId);

    for (const row of rows) map.set(row.postId, Number(row.total));
    return map;
  }

  async findAll(query: PostQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [isNull(posts.deletedAt)];
    if (query.deptId) {
      // 含所选组织的全部下级组织（递归 CTE）
      const subtreeIds = await collectDeptSubtreeIds(query.deptId);
      conditions.push(inArray(posts.deptId, subtreeIds));
    }
    if (query.keyword) {
      const pattern = `%${query.keyword}%`;
      conditions.push(sql`${posts.name} ILIKE ${pattern}`);
    }
    if (query.category) {
      conditions.push(eq(posts.category, query.category));
    }
    if (query.status) {
      conditions.push(eq(posts.status, query.status));
    }
    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(where);

    // 排序白名单避免注入；默认创建时间降序
    const sortCol =
      query.sort && SORTABLE.has(query.sort) ? query.sort : 'createdAt';
    const dir = query.order === 'asc' ? asc : desc;
    const orderBy = dir((posts as any)[sortCol]);

    const rows = await db
      .select()
      .from(posts)
      .where(where)
      .orderBy(orderBy, asc(posts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [deptPathMap, userCountMap] = await Promise.all([
      buildDeptPathMap(),
      this.loadUserCounts(rows.map((r) => r.id)),
    ]);

    return {
      data: rows.map((row) =>
        toView(row, deptPathMap.get(row.deptId) ?? '', userCountMap.get(row.id) ?? 0),
      ),
      pagination: { page, pageSize, total },
    };
  }

  async findOne(id: string): Promise<PostView> {
    const row = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), isNull(posts.deletedAt)),
    });
    if (!row) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: '岗位不存在',
      });
    }
    const [deptPathMap, userCountMap] = await Promise.all([
      buildDeptPathMap(),
      this.loadUserCounts([id]),
    ]);

    return toView(row, deptPathMap.get(row.deptId) ?? '', userCountMap.get(id) ?? 0);
  }

  async create(dto: PostCreateDto, operatorId: string | null): Promise<PostView> {
    await this.assertValidDept(dto.deptId);

    const [row] = await db
      .insert(posts)
      .values({
        name: dto.name,
        deptId: dto.deptId,
        category: dto.category,
        rank: dto.rank ?? '',
        status: dto.status ?? 'enabled',
      })
      .returning()
      .catch((err) => this.handleUniqueError(err));

    await this.writeLog('post.create', operatorId, {
      id: row.id,
      name: row.name,
      deptId: row.deptId,
    });
    return this.findOne(row.id);
  }

  async update(
    id: string,
    dto: PostUpdateDto,
    operatorId: string | null,
  ): Promise<PostView> {
    const existing = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), isNull(posts.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: '岗位不存在',
      });
    }
    if (dto.deptId !== undefined && dto.deptId !== existing.deptId) {
      await this.assertValidDept(dto.deptId);
    }

    const [row] = await db
      .update(posts)
      .set({
        name: dto.name ?? existing.name,
        deptId: dto.deptId ?? existing.deptId,
        category: dto.category ?? existing.category,
        rank: dto.rank === undefined ? existing.rank : dto.rank,
        status: dto.status ?? existing.status,
      })
      .where(eq(posts.id, id))
      .returning()
      .catch((err) => this.handleUniqueError(err));

    await this.writeLog('post.update', operatorId, {
      id,
      deptId: row.deptId,
      status: row.status,
    });
    return this.findOne(id);
  }

  /**
   * 删除岗位（软删）。校验在职人员：存在 → 409 POST_HAS_ACTIVE_USERS（message 携带人数）。
   * 通过后软删除并同步清理该岗位的 user_post 关联（事务原子）。敏感操作，记录操作日志。
   */
  async remove(id: string, operatorId: string | null) {
    const existing = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), isNull(posts.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: '岗位不存在',
      });
    }

    const userCountMap = await this.loadUserCounts([id]);
    const userCount = userCountMap.get(id) ?? 0;
    if (userCount > 0) {
      throw new ConflictException({
        code: 'POST_HAS_ACTIVE_USERS',
        message: `该岗位下存在 ${userCount} 名在职人员，请先调岗或离职处理`,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({ deletedAt: new Date() })
        .where(eq(posts.id, id));
      // 同步清理关联记录（岗位软删不触发数据库级联）
      await tx.delete(userPosts).where(eq(userPosts.postId, id));
    });
    await this.writeLog('post.delete', operatorId, { id, name: existing.name });
    return null;
  }

  /** 岗位在职人员名单（在职人数穿透）：仅在职且未删除的用户 */
  async findMembers(
    id: string,
    query: { page?: number; pageSize?: number },
  ): Promise<{
    data: DirectoryEntryView[];
    pagination: { page: number; pageSize: number; total: number };
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const post = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), isNull(posts.deletedAt)),
    });
    if (!post) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: '岗位不存在',
      });
    }

    // 在职过滤在 innerJoin 条件（employedUserFilter）中生效
    const where = eq(userPosts.postId, id);

    const [{ total }] = await db
      .select({ total: count() })
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
        createdAt: users.createdAt,
      })
      .from(userPosts)
      .innerJoin(users, and(eq(userPosts.userId, users.id), employedUserFilter))
      .where(where)
      .orderBy(asc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const extrasMap = await loadDirectoryExtras(rows.map((r) => r.id));

    return {
      data: rows.map((row) =>
        toDirectoryEntryView(row, extrasMap.get(row.id)),
      ),
      pagination: { page, pageSize, total },
    };
  }
}
