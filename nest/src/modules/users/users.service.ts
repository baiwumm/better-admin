import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  users,
  userRoles,
  roles,
  logs,
  refreshTokens,
  userPosts,
  posts,
  depts,
} from '../../db/schema';
import {
  SUPER_ADMIN_ROLE_CODE,
} from '../../db/schema/permissions.enum';
import {
  assertValidDeptId,
  assertValidPostIds,
} from '../org/org-views';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { UserQueryDto } from './dto/user-query.dto';

/** 用户关联的角色视图（roles 表字段子集） */
export type UserRoleView = {
  id: string;
  name: string;
  code: string;
};

/** 用户关联的岗位视图（v1.6.0 组织中心；posts 表字段子集） */
export type UserPostView = {
  id: string;
  name: string;
  category: string;
  /** 是否主岗 */
  isMain: boolean;
};

/** 对外返回的用户视图（不含 passwordHash） */
export type UserView = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  /** 电话（v1.5.0） */
  phone: string | null;
  /** 个人标签（v1.5.0） */
  tags: string[] | null;
  /** 个人网站裸域名（v1.5.2，管理端只读展示） */
  website: string | null;
  /** GitHub 用户名裸值（v1.5.2，管理端只读展示） */
  githubUsername: string | null;
  /** X（Twitter）用户名裸值（v1.5.2，管理端只读展示） */
  xUsername: string | null;
  /** 所属组织 ID / 名称（v1.6.0 组织中心，可空） */
  deptId: string | null;
  deptName: string | null;
  /** 工号（v1.6.0，可空） */
  employeeNo: string | null;
  /** 入职日期（v1.6.0，YYYY-MM-DD，可空） */
  entryDate: string | null;
  /** 在职状态（v1.6.0；存量 NULL 按在职输出） */
  employmentStatus: 'employed' | 'resigned';
  /** 性别（v1.6.0 阶段 2 补充；male 男 / female 女，null = 未设置） */
  gender: 'male' | 'female' | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  /** 用户关联的角色（多对多，经 user_roles 联查） */
  roles: UserRoleView[];
  /** 用户关联的岗位（多对多 + 主岗标记，经 user_posts 联查） */
  posts: UserPostView[];
};

const SORTABLE = new Set([
  'id',
  'username',
  'email',
  'displayName',
  'employeeNo',
  'entryDate',
  'employmentStatus',
  'status',
  'createdAt',
  'updatedAt',
]);

/** 内置管理员用户名（seed 固定创建，见 src/db/seed.ts） */
const ADMIN_USERNAME = 'admin';

function toView(
  row: typeof users.$inferSelect,
  extras?: { deptName: string | null; posts: UserPostView[] },
): Omit<UserView, 'roles'> {
  // tokenVersion 为内部会话撤销用的版本号，不对外暴露；
  // 组织/岗位摘要由 extras 注入（deptName 联查、posts 列表）
  const {
    passwordHash: _omit,
    deletedAt: _d,
    tokenVersion: _tv,
    ...rest
  } = row;
  return {
    ...rest,
    // 存量 employment_status 为 NULL 的按在职输出
    employmentStatus: rest.employmentStatus === 'resigned' ? 'resigned' : 'employed',
    deptName: extras?.deptName ?? null,
    posts: extras?.posts ?? [],
  } as Omit<UserView, 'roles'>;
}

@Injectable()
export class UsersService {
  /**
   * v1.4.6 用户写操作保护（删除/停用/重置密码共用），对齐角色侧
   * SUPER_ADMIN_ROLE_PROTECTED（roles.service）：
   * 1. 不能操作当前登录用户本人 → 400 SELF_OPERATION_FORBIDDEN
   * 2. 内置 admin 用户 → 403 ADMIN_USER_PROTECTED
   * 3. 绑定 super_admin 角色的用户 → 403 SUPER_ADMIN_USER_PROTECTED；
   *    操作者本人也是 super_admin 时豁免（admin 用户受规则 2 绝对保护，
   *    超管账号不可能被删光，豁免不会锁死系统）
   */
  private async assertTargetOperable(
    target: { id: string; username: string },
    operatorId: string | null,
  ) {
    if (operatorId && target.id === operatorId) {
      throw new BadRequestException({
        code: 'SELF_OPERATION_FORBIDDEN',
        message: '不能操作当前登录用户',
      });
    }
    if (target.username === ADMIN_USERNAME) {
      throw new ForbiddenException({
        code: 'ADMIN_USER_PROTECTED',
        message: '系统内置管理员账号不可操作',
      });
    }
    const targetBound = await this.filterSuperAdminIds([target.id]);
    if (targetBound.size > 0) {
      const operatorBound =
        operatorId && (await this.filterSuperAdminIds([operatorId])).size > 0;
      if (!operatorBound) {
        throw new ForbiddenException({
          code: 'SUPER_ADMIN_USER_PROTECTED',
          message: '该用户绑定了超级管理员角色，不可操作',
        });
      }
    }
  }

  /** 批量版保护校验：任一目标命中规则即整体拒绝（与批量删的全有全无语义一致） */
  private async assertBatchOperable(
    targets: { id: string; username: string }[],
    operatorId: string | null,
  ) {
    if (operatorId && targets.some((t) => t.id === operatorId)) {
      throw new BadRequestException({
        code: 'SELF_OPERATION_FORBIDDEN',
        message: '不能操作当前登录用户',
      });
    }
    if (targets.some((t) => t.username === ADMIN_USERNAME)) {
      throw new ForbiddenException({
        code: 'ADMIN_USER_PROTECTED',
        message: '系统内置管理员账号不可操作',
      });
    }
    const superAdminIds = await this.filterSuperAdminIds(
      targets.map((t) => t.id),
    );
    if (superAdminIds.size > 0) {
      const operatorBound =
        operatorId && (await this.filterSuperAdminIds([operatorId])).size > 0;
      if (!operatorBound) {
        throw new ForbiddenException({
          code: 'SUPER_ADMIN_USER_PROTECTED',
          message: '该用户绑定了超级管理员角色，不可操作',
        });
      }
    }
  }

  /** 查询 userIds 中绑定了 super_admin 角色的用户 id 集合（user_roles → roles） */
  private async filterSuperAdminIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          inArray(userRoles.userId, userIds),
          eq(roles.code, SUPER_ADMIN_ROLE_CODE),
        ),
      );
    return new Set(rows.map((r) => r.userId));
  }

  /** 校验 roleIds 中是否包含 super_admin 角色 */
  private async roleContainsSuperAdmin(roleIds: string[]): Promise<boolean> {
    if (roleIds.length === 0) return false;
    const rows = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(inArray(roles.id, roleIds), eq(roles.code, SUPER_ADMIN_ROLE_CODE)));
    return rows.length > 0;
  }

  /**
   * super_admin 角色绑定保护：
   * 1. 不可移除 super_admin 角色绑定（除非操作者也是 super_admin）
   * 2. 不可给其他用户添加 super_admin 角色（除非操作者也是 super_admin）
   */
  private async assertValidRoleBindingChange(
    targetUserId: string,
    newRoleIds: string[],
    operatorId: string | null,
  ) {
    const hasSuperAdminInNew = await this.roleContainsSuperAdmin(newRoleIds);
    const hasSuperAdminInExisting = (await this.filterSuperAdminIds([targetUserId])).size > 0;

    // 试图移除 super_admin 绑定
    if (hasSuperAdminInExisting && !hasSuperAdminInNew) {
      const operatorBound = operatorId && (await this.filterSuperAdminIds([operatorId])).size > 0;
      if (!operatorBound) {
        throw new ForbiddenException({
          code: 'SUPER_ADMIN_ROLE_BINDING_PROTECTED',
          message: '不可移除超级管理员角色绑定',
        });
      }
    }

    // 试图给其他用户添加 super_admin 角色
    if (!hasSuperAdminInExisting && hasSuperAdminInNew) {
      const operatorBound = operatorId && (await this.filterSuperAdminIds([operatorId])).size > 0;
      if (!operatorBound) {
        throw new ForbiddenException({
          code: 'SUPER_ADMIN_ROLE_BINDING_PROTECTED',
          message: '不可为用户添加超级管理员角色',
        });
      }
    }
  }

  /** 捕获唯一索引冲突，转换为业务 409 错误 */
  private handleUniqueError(err: any): never {
    // drizzle 0.45 将 pg 错误包装为 DrizzleQueryError，原始错误的 constraint 挂在 cause 上
    const constraint: string = err?.constraint ?? err?.cause?.constraint ?? '';
    if (constraint.includes('username')) {
      throw new ConflictException({
        code: 'USERNAME_EXISTS',
        message: '用户名已存在',
      });
    }
    if (constraint.includes('email')) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: '邮箱已存在',
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
       
      console.error('[users] 写入日志失败:', err);
    }
  }

  /** 仅返回未软删的用户行（共用 WHERE 条件） */
  private activeWhere(extra?: any) {
    return extra ? and(isNull(users.deletedAt), extra) : isNull(users.deletedAt);
  }

  /**
   * 批量查询 userIds 的角色关联（user_roles → roles），
   * 返回 Map<userId, UserRoleView[]>。一次查询，避免 N+1。
   */
  private async loadRoles(
    userIds: string[],
  ): Promise<Map<string, UserRoleView[]>> {
    if (userIds.length === 0) return new Map();
    const rows = await db
      .select({
        userId: userRoles.userId,
        roleId: roles.id,
        roleName: roles.name,
        roleCode: roles.code,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(userRoles.userId, userIds))
      .orderBy(roles.sort, roles.name);

    const map = new Map<string, UserRoleView[]>();
    for (const r of rows) {
      const list = map.get(r.userId) ?? [];
      list.push({ id: r.roleId, name: r.roleName, code: r.roleCode });
      map.set(r.userId, list);
    }
    return map;
  }

  /** 校验 roleIds 全部有效（存在），存在无效 ID 时抛 VALIDATION_ERROR */
  private async assertValidRoleIds(roleIds: string[]) {
    if (roleIds.length === 0) return;
    const rows = await db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.id, roleIds));
    const validIds = new Set(rows.map((r) => r.id));
    const invalid = roleIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `角色不存在或已停用: ${invalid.join(', ')}`,
      });
    }
  }

  /** 批量查询 userIds 的岗位关联（user_posts → posts 未删除；v1.6.0 组织中心） */
  private async loadPosts(
    userIds: string[],
  ): Promise<Map<string, UserPostView[]>> {
    if (userIds.length === 0) return new Map();
    const rows = await db
      .select({
        userId: userPosts.userId,
        postId: posts.id,
        postName: posts.name,
        postCategory: posts.category,
        isMain: userPosts.isMain,
      })
      .from(userPosts)
      .innerJoin(
        posts,
        and(eq(userPosts.postId, posts.id), isNull(posts.deletedAt)),
      )
      .where(inArray(userPosts.userId, userIds))
      .orderBy(desc(userPosts.isMain), asc(posts.name));

    const map = new Map<string, UserPostView[]>();
    for (const r of rows) {
      const list = map.get(r.userId) ?? [];
      list.push({
        id: r.postId,
        name: r.postName,
        category: r.postCategory,
        isMain: r.isMain,
      });
      map.set(r.userId, list);
    }
    return map;
  }

  /** 批量查询 userIds 的所属组织名称（users.dept_id → depts 未删除） */
  private async loadDeptNames(
    userIds: string[],
  ): Promise<Map<string, string | null>> {
    if (userIds.length === 0) return new Map();
    const rows = await db
      .select({ id: users.id, deptName: depts.name })
      .from(users)
      .leftJoin(
        depts,
        and(eq(users.deptId, depts.id), isNull(depts.deletedAt)),
      )
      .where(inArray(users.id, userIds));
    const map = new Map<string, string | null>();
    for (const r of rows) map.set(r.id, r.deptName ?? null);
    return map;
  }

  /** 组织/岗位摘要批量装载（findAll / findOne / create / update 共用，避免 N+1） */
  private async loadOrgExtras(userIds: string[]) {
    const [postsMap, deptMap] = await Promise.all([
      this.loadPosts(userIds),
      this.loadDeptNames(userIds),
    ]);
    const map = new Map<
      string,
      { deptName: string | null; posts: UserPostView[] }
    >();
    for (const id of userIds) {
      map.set(id, {
        deptName: deptMap.get(id) ?? null,
        posts: postsMap.get(id) ?? [],
      });
    }
    return map;
  }

  /** 校验 mainPostId 必须在关联岗位列表中（v1.6.0；主岗至多一条由 isMain 唯一标记保证） */
  private assertValidMainPost(mainPostId: string | null | undefined, postIds: string[]) {
    if (mainPostId && !postIds.includes(mainPostId)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '主岗必须在关联岗位列表中',
      });
    }
  }

  async findAll(query: UserQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [isNull(users.deletedAt)];
    if (query.status) {
      conditions.push(eq(users.status, query.status));
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        sql`(${users.username} ILIKE ${pattern} OR ${users.email} ILIKE ${pattern} OR ${users.displayName} ILIKE ${pattern})`,
      );
    }
    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(where);

    // 排序白名单，避免注入
    const sortCol = query.sort && SORTABLE.has(query.sort) ? query.sort : 'createdAt';
    const dir = query.order === 'asc' ? asc : desc;
    const orderBy = dir((users as any)[sortCol]);

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 批量加载角色与组织/岗位摘要（各一次查询，避免 N+1）
    const rolesMap = await this.loadRoles(rows.map((r) => r.id));
    const extras = await this.loadOrgExtras(rows.map((r) => r.id));

    return {
      data: rows.map((row) => ({
        ...toView(row, extras.get(row.id)),
        roles: rolesMap.get(row.id) ?? [],
      })),
      pagination: { page, pageSize, total },
    };
  }

  async findOne(id: string) {
    const row = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!row) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    const rolesMap = await this.loadRoles([id]);
    const extras = await this.loadOrgExtras([id]);
    return {
      ...toView(row, extras.get(id)),
      roles: rolesMap.get(id) ?? [],
    };
  }

  async create(dto: CreateUserDto, operatorId: string | null) {
    const roleIds = dto.roleIds ?? [];
    // 外键校验：角色 id 必须全部有效，避免外键报错（VALIDATION_ERROR）
    await this.assertValidRoleIds(roleIds);

    // 组织中心关联校验（v1.6.0）：deptId 须存在且启用；postIds 全部有效；主岗须在 postIds 中
    if (dto.deptId) {
      await assertValidDeptId(dto.deptId);
    }
    const postIds = dto.postIds ?? [];
    await assertValidPostIds(postIds);
    this.assertValidMainPost(dto.mainPostId, postIds);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      // 用户创建与角色/岗位关联必须原子：db.transaction
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(users)
          .values({
            username: dto.username,
            email: dto.email,
            passwordHash,
            displayName: dto.displayName,
            avatar: dto.avatar ?? null,
            status: dto.status ?? 'active',
            deptId: dto.deptId ?? null,
            employeeNo: dto.employeeNo ?? null,
            entryDate: dto.entryDate ?? null,
            employmentStatus: dto.employmentStatus ?? null,
            gender: dto.gender ?? null,
          })
          .returning();

        if (roleIds.length > 0) {
          // super_admin 角色绑定保护：创建即绑定 super_admin 角色要求操作者自身为超管
          await this.assertValidRoleBindingChange(row.id, roleIds, operatorId);
          await tx
            .insert(userRoles)
            .values(roleIds.map((roleId) => ({ userId: row.id, roleId })));
        }
        if (postIds.length > 0) {
          await tx.insert(userPosts).values(
            postIds.map((postId) => ({
              userId: row.id,
              postId,
              isMain: postId === (dto.mainPostId ?? null),
            })),
          );
        }
        return row;
      });

      await this.writeLog('user.create', operatorId, {
        id: created.id,
        username: created.username,
        roleIds,
        deptId: created.deptId,
        postIds,
      });

      const rolesMap = await this.loadRoles([created.id]);
      const extras = await this.loadOrgExtras([created.id]);
      return {
        ...toView(created, extras.get(created.id)),
        roles: rolesMap.get(created.id) ?? [],
      };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async update(id: string, dto: UpdateUserDto, operatorId: string | null) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    // v1.4.6 保护：编辑接口请求停用受保护用户时与 /status 端点同权拦截
    //（编辑邮箱/昵称等资料不受限）
    if (dto.status === 'disabled') {
      await this.assertTargetOperable(existing, operatorId);
    }

    // roleIds 为 undefined 表示「未修改角色」；为数组（含空数组）表示「全量替换」
    if (dto.roleIds !== undefined) {
      await this.assertValidRoleIds(dto.roleIds);
      // super_admin 角色绑定保护：不可移除或添加 super_admin 角色绑定（超管间互操作豁免）
      await this.assertValidRoleBindingChange(id, dto.roleIds, operatorId);
    }

    // 组织中心关联校验（v1.6.0）：postIds 全量替换语义同 roleIds；主岗须在列表中
    if (dto.deptId) {
      await assertValidDeptId(dto.deptId);
    }
    if (dto.postIds !== undefined) {
      await assertValidPostIds(dto.postIds);
      this.assertValidMainPost(dto.mainPostId, dto.postIds);
    }

    try {
      // 用户更新与角色/岗位关联全量替换必须原子：db.transaction
      const row = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(users)
          .set({
            email: dto.email ?? existing.email,
            displayName: dto.displayName ?? existing.displayName,
            avatar: dto.avatar === undefined ? existing.avatar : dto.avatar,
            status: dto.status ?? existing.status,
            deptId: dto.deptId === undefined ? existing.deptId : dto.deptId,
            employeeNo:
              dto.employeeNo === undefined
                ? existing.employeeNo
                : dto.employeeNo,
            entryDate:
              dto.entryDate === undefined ? existing.entryDate : dto.entryDate,
            employmentStatus:
              dto.employmentStatus === undefined
                ? existing.employmentStatus
                : dto.employmentStatus,
            gender: dto.gender === undefined ? existing.gender : dto.gender,
          })
          .where(eq(users.id, id))
          .returning();

        if (dto.roleIds !== undefined) {
          // 全量替换：删除旧关联 → 插入新关联（空数组即清空）
          await tx.delete(userRoles).where(eq(userRoles.userId, id));
          if (dto.roleIds.length > 0) {
            await tx
              .insert(userRoles)
              .values(dto.roleIds.map((roleId) => ({ userId: id, roleId })));
          }
        }
        if (dto.postIds !== undefined) {
          // 全量替换：空数组即清空岗位；mainPostId 为空则全部 isMain=false
          await tx.delete(userPosts).where(eq(userPosts.userId, id));
          if (dto.postIds.length > 0) {
            await tx.insert(userPosts).values(
              dto.postIds.map((postId) => ({
                userId: id,
                postId,
                isMain: postId === (dto.mainPostId ?? null),
              })),
            );
          }
        }
        return updated;
      });

      await this.writeLog('user.update', operatorId, {
        id,
        roleIds: dto.roleIds,
        deptId: dto.deptId,
        postIds: dto.postIds,
      });

      const rolesMap = await this.loadRoles([id]);
      const extras = await this.loadOrgExtras([id]);
      return {
        ...toView(row, extras.get(id)),
        roles: rolesMap.get(id) ?? [],
      };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async remove(id: string, operatorId: string | null) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    await this.assertTargetOperable(existing, operatorId);
    // 软删除同时清理角色/岗位绑定与托管会话：username 部分唯一索引（deleted_at IS NULL）
    // 允许同名新用户复用该名字，残留绑定会导致登录聚合误取幽灵用户的权限
    await db.transaction(async (tx) => {
      await tx.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
      await tx.delete(userRoles).where(eq(userRoles.userId, id));
      await tx.delete(userPosts).where(eq(userPosts.userId, id));
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    });
    await this.writeLog('user.delete', operatorId, { id });
    return null;
  }

  /** 批量软删；部分 ID 无效或已删除时返回 400 INVALID_OPERATION */
  async batchRemove(ids: string[], operatorId: string | null) {
    if (!ids.length) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '未提供有效的用户 ID',
      });
    }
    // 仅对「当前存在且未软删」的 ID 生效
    const existing = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(and(isNull(users.deletedAt), sql`${users.id} IN ${ids}`));

    const validIds = new Set(existing.map((r) => r.id));
    const invalid = ids.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '部分用户 ID 无效或无权限操作',
      });
    }

    // v1.4.6 保护：任一目标命中规则即整体拒绝（全有全无）
    await this.assertBatchOperable(existing, operatorId);

    // 同 remove：软删除 + 清理角色/岗位绑定与托管会话（事务原子）
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ deletedAt: new Date() })
        .where(and(isNull(users.deletedAt), sql`${users.id} IN ${ids}`));
      await tx.delete(userRoles).where(sql`${userRoles.userId} IN ${ids}`);
      await tx.delete(userPosts).where(sql`${userPosts.userId} IN ${ids}`);
      await tx.delete(refreshTokens).where(sql`${refreshTokens.userId} IN ${ids}`);
    });
    await this.writeLog('user.batch_delete', operatorId, { ids });
    return null;
  }

  async resetPassword(id: string, newPassword: string, operatorId: string | null) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    // v1.4.6 保护：不能重置自己/受保护用户的密码（本人改密走 Auth 模块接口）
    await this.assertTargetOperable(existing, operatorId);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    // 同步 bump tokenVersion：该用户全部存量 access/refresh token 立即失效（强制重登）
    await db
      .update(users)
      .set({ passwordHash, tokenVersion: existing.tokenVersion + 1 })
      .where(eq(users.id, id));
    // 撤销其全部托管 refreshToken，防止改密码后旧刷新链路继续续期
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, id));
    await this.writeLog('user.reset_password', operatorId, { id });
    return null;
  }

  async updateStatus(
    id: string,
    status: 'active' | 'disabled',
    operatorId: string | null,
  ) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    // v1.4.6 保护：不能停用自己/受保护用户（启用自己允许，故仅在 disabled 时校验）
    if (status === 'disabled') {
      await this.assertTargetOperable(existing, operatorId);
    }
    // 封禁时 bump tokenVersion 并清空托管会话：已登录设备即刻全端下线；
    // 解封不 bump（恢复账号无需追加撤销）。
    const bumpVersion =
      status === 'disabled' ? existing.tokenVersion + 1 : existing.tokenVersion;
    const [row] = await db
      .update(users)
      .set({ status, tokenVersion: bumpVersion })
      .where(eq(users.id, id))
      .returning();
    if (status === 'disabled') {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    }
    await this.writeLog('user.status_update', operatorId, { id, status });
    const rolesMap = await this.loadRoles([id]);
    const extras = await this.loadOrgExtras([id]);
    return {
      ...toView(row, extras.get(id)),
      roles: rolesMap.get(id) ?? [],
    };
  }
}
