import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { roles, roleMenus, userRoles, menus, logs, users } from '@/db/schema';
import {
  Permissions,
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_BITS_POSITIVE,
  SUPER_ADMIN_ROLE_CODE,
  normalizePermissionBits,
} from '@/db/schema/permissions.enum';
import {
  DirectoryEntryView,
  employedUserFilter,
  loadDirectoryExtras,
  toDirectoryEntryView,
} from '../org/org-views';
import { CreateRoleDto } from './dto/role-create.dto';
import { UpdateRoleDto } from './dto/role-update.dto';
import { RoleMenusUpdateDto } from './dto/role-menus.dto';
import { RoleQueryDto } from './dto/role-query.dto';

export type RoleView = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  enabled: boolean;
  sort: number;
  /** 关联用户总数（仅在职且未删除；管理列表接口回填，详情接口不带） */
  userCount?: number;
  /** 最近关联用户（最多 3 个；管理列表接口回填，详情接口不带） */
  readers?: RoleReaderView[];
  createdAt: Date;
  updatedAt: Date;
};

/** 角色关联用户摘要（与 openapi.yaml RoleReader 对齐；形状同 NoticeReader） */
export type RoleReaderView = {
  id: string;
  name: string;
  avatar: string | null;
};

/** 所有合法权限位的 OR 聚合（用于校验传入的位掩码是否越界） */
const ALL_PERMISSION_BITS = (Object.values(Permissions) as { bits: bigint }[]).reduce(
  (acc, p) => acc | p.bits,
  0n,
);

function toView(row: typeof roles.$inferSelect): RoleView {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    enabled: row.enabled,
    sort: row.sort,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** 校验位掩码：必须是合法权限位的组合（或全量位 -1n / 正数 9223372036854775807） */
function assertValidBits(raw: string) {
  let bits: bigint;
  try {
    bits = BigInt(raw);
  } catch {
    throw new BadRequestException({
      code: 'INVALID_OPERATION',
      message: 'permissions 不是合法的位掩码',
    });
  }
  if (bits === SUPER_ADMIN_BITS || bits === SUPER_ADMIN_BITS_POSITIVE) return;
  if (bits < 0n || (bits & ~ALL_PERMISSION_BITS) !== 0n) {
    throw new BadRequestException({
      code: 'INVALID_OPERATION',
      message: 'permissions 包含非法权限位',
    });
  }
}

@Injectable()
export class RolesService {
  /**
   * 系统内置角色保护：super_admin 的 role_menus 授权是全量权限的载体
   * （登录/每请求实时 OR 聚合，seed 写入 -1n 全量位），修改其授权或删除
   * 角色会让绑定用户立即失去全部权限且无自助恢复手段，故一律 403 拦截。
   */
  private assertNotSuperAdmin(role: { code: string }) {
    if (role.code === SUPER_ADMIN_ROLE_CODE) {
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_ROLE_PROTECTED',
        message: '超级管理员为系统内置角色，不可修改或删除',
      });
    }
  }

  private handleUniqueError(err: any): never {
    // drizzle 0.45 将 pg 错误包装为 DrizzleQueryError，原始错误的 constraint 挂在 cause 上
    const constraint: string = err?.constraint ?? err?.cause?.constraint ?? '';
    if (constraint.includes('code')) {
      throw new ConflictException({
        code: 'ROLE_CODE_EXISTS',
        message: '角色 code 已存在',
      });
    }
    if (constraint.includes('name')) {
      throw new ConflictException({
        code: 'ROLE_NAME_EXISTS',
        message: '角色名称已存在',
      });
    }
    throw err;
  }

  private async writeLog(action: string, operatorId: string | null, detail?: unknown) {
    try {
      await db.insert(logs).values({
        type: 'operation',
        action,
        userId: operatorId,
        detail: detail === undefined ? null : (detail as any),
      });
    } catch (err) {
       
      console.error('[roles] 写入日志失败:', err);
    }
  }

  async findAll(query: RoleQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const conditions = [];
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        sql`(${roles.name} ILIKE ${pattern} OR ${roles.code} ILIKE ${pattern})`,
      );
    }
    if (query.enabled) {
      conditions.push(eq(roles.enabled, query.enabled === 'true'));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(roles)
      .where(where);

    const rows = await db
      .select()
      .from(roles)
      .where(where)
      // sort 权重语义：大在前；createdAt/id 兜底保证同 sort 值时新角色在前、分页稳定
      .orderBy(desc(roles.sort), desc(roles.createdAt), desc(roles.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const views = rows.map(toView);
    // 关联用户摘要整页两次批量（总数 1 组 + 最近 3 人 1 组），内存回填（契约 v1.13.0）
    const roleIds = views.map((v) => v.id);
    const countsByRole = await this.loadUserCountsBatch(roleIds);
    const readersByRole = await this.loadReadersBatch(roleIds);
    for (const view of views) {
      view.userCount = countsByRole.get(view.id) ?? 0;
      view.readers = readersByRole.get(view.id) ?? [];
    }

    return {
      data: views,
      pagination: { page, pageSize, total },
    };
  }

  /** 批量统计多个角色的关联用户总数（仅在职且未删除，口径同 org-views.employedUserFilter） */
  private async loadUserCountsBatch(roleIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (roleIds.length === 0) return map;

    const rows = await db
      .select({ roleId: userRoles.roleId, total: count() })
      .from(userRoles)
      .innerJoin(users, and(eq(userRoles.userId, users.id), employedUserFilter))
      .where(inArray(userRoles.roleId, roleIds))
      .groupBy(userRoles.roleId);
    for (const row of rows) map.set(row.roleId, row.total);
    return map;
  }

  /** 批量装载多个角色的最近关联用户（窗口函数每组取 3 条）：全页 1 组查询 */
  private async loadReadersBatch(
    roleIds: string[],
  ): Promise<Map<string, RoleReaderView[]>> {
    const map = new Map<string, RoleReaderView[]>();
    if (roleIds.length === 0) return map;
    for (const id of roleIds) map.set(id, []);

    // 窗口函数写法与 notice.service.loadReadersBatch 一致；过滤条件为
    // org-views.employedUserFilter 的 SQL 形态（未删除且非离职，存量 null 按在职）
    const result = await db.execute(sql`
      SELECT t.role_id, t.user_id, t.display_name, t.avatar
      FROM (
        SELECT ur.role_id, ur.user_id, u.display_name, u.avatar,
               row_number() OVER (
                 PARTITION BY ur.role_id
                 ORDER BY ur.created_at DESC, ur.user_id
               ) AS rn
        FROM user_roles ur
        INNER JOIN users u ON u.id = ur.user_id
        WHERE ur.role_id IN (${sql.join(roleIds.map((id) => sql`${id}`), sql`, `)})
          AND u.deleted_at IS NULL
          AND (u.employment_status IS NULL OR u.employment_status <> 'resigned')
      ) t
      WHERE t.rn <= 3
    `);
    const rows = result.rows as {
      role_id: string;
      user_id: string;
      display_name: string;
      avatar: string | null;
    }[];

    for (const row of rows) {
      map.get(row.role_id)?.push({
        id: row.user_id,
        name: row.display_name,
        avatar: row.avatar,
      });
    }
    return map;
  }

  /**
   * GET /roles/:id/users — 角色关联用户名单（关联用户穿透，契约 v1.13.0）。
   * 过滤口径与 /org/posts/:id/members 一致（未删除且非离职）；
   * 形状同岗位成员穿透：DirectoryEntry 分页 + loadDirectoryExtras 回填部门路径。
   */
  async findUsers(
    id: string,
    query: { page?: number; pageSize?: number },
  ): Promise<{
    data: DirectoryEntryView[];
    pagination: { page: number; pageSize: number; total: number };
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    if (!role) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      });
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(userRoles)
      .innerJoin(users, and(eq(userRoles.userId, users.id), employedUserFilter))
      .where(eq(userRoles.roleId, id));

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
      .from(userRoles)
      .innerJoin(users, and(eq(userRoles.userId, users.id), employedUserFilter))
      .where(eq(userRoles.roleId, id))
      // 与全站列表口径一致：创建时间降序 + id 兜底保证分页稳定
      .orderBy(desc(users.createdAt), desc(users.id))
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

  async findOne(id: string) {
    const row = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    if (!row) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      });
    }
    return toView(row);
  }

  async create(dto: CreateRoleDto, operatorId: string | null) {
    try {
      const [row] = await db
        .insert(roles)
        .values({
          name: dto.name,
          code: dto.code,
          description: dto.description ?? null,
          enabled: dto.enabled ?? true,
          sort: dto.sort ?? 0,
        })
        .returning();
      await this.writeLog('role.create', operatorId, { id: row.id, code: row.code });
      return toView(row);
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async update(id: string, dto: UpdateRoleDto, operatorId: string | null) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      });
    }
    // 系统内置角色保护：super_admin 角色不可停用（enabled 参与聚合，停用将使
    // 绑定用户聚合位清空、全后台失权且无自助恢复手段）；name/description/sort
    // 无权限语义，允许修改（对齐前端「编辑保留」设计）
    if (existing.code === SUPER_ADMIN_ROLE_CODE && dto.enabled === false) {
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_ROLE_PROTECTED',
        message: '超级管理员为系统内置角色，不可停用',
      });
    }

    // code 锁定，不允许修改
    try {
      const [row] = await db
        .update(roles)
        .set({
          name: dto.name ?? existing.name,
          description: dto.description ?? existing.description,
          enabled: dto.enabled ?? existing.enabled,
          sort: dto.sort ?? existing.sort,
        })
        .where(eq(roles.id, id))
        .returning();
      await this.writeLog('role.update', operatorId, { id });
      return toView(row);
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async remove(id: string, operatorId: string | null) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      });
    }
    this.assertNotSuperAdmin(existing);
    // 检查是否有关联用户，存在则禁止删除
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(userRoles)
      .where(eq(userRoles.roleId, id));
    if (cnt > 0) {
      throw new ConflictException({
        code: 'ROLE_IN_USE',
        message: '该角色已关联用户，无法删除',
      });
    }
    await db.delete(roles).where(eq(roles.id, id));
    await this.writeLog('role.delete', operatorId, { id });
    return null;
  }

  /** GET /api/roles/:id/menus — 返回该角色当前菜单授权列表 */
  async getMenus(id: string) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      });
    }
    const rows = await db
      .select({ menuId: roleMenus.menuId, permissions: roleMenus.permissions })
      .from(roleMenus)
      .where(eq(roleMenus.roleId, id));
    return {
      roleId: id,
      menus: rows.map((r) => ({ menuId: r.menuId, permissions: normalizePermissionBits(r.permissions).toString() })),
    };
  }

  /** PUT /api/roles/:id/menus — 全量替换角色菜单授权 */
  async updateMenus(id: string, dto: RoleMenusUpdateDto, operatorId: string | null) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      });
    }
    this.assertNotSuperAdmin(existing);

    // 校验 menuId 全部存在
    const menuIds = dto.menus.map((m) => m.menuId);
    if (menuIds.length > 0) {
      const found = await db
        .select({ id: menus.id })
        .from(menus)
        .where(inArray(menus.id, menuIds));
      const foundSet = new Set(found.map((m) => m.id));
      const invalid = menuIds.filter((mid) => !foundSet.has(mid));
      if (invalid.length > 0) {
        throw new BadRequestException({
          code: 'INVALID_OPERATION',
          message: '部分 menuId 不存在',
        });
      }
    }

    // 校验每个 permissions 位掩码合法
    for (const m of dto.menus) {
      assertValidBits(m.permissions);
    }

    // 全量替换：先删后插（事务）
    await db.transaction(async (tx) => {
      await tx.delete(roleMenus).where(eq(roleMenus.roleId, id));
      if (dto.menus.length > 0) {
        await tx.insert(roleMenus).values(
          dto.menus.map((m) => ({
            roleId: id,
            menuId: m.menuId,
            permissions: BigInt(m.permissions),
          })),
        );
      }
    });

    await this.writeLog('role.menus_update', operatorId, { id, count: dto.menus.length });
    return this.getMenus(id);
  }
}
