import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { roles, roleMenus, userRoles, menus, logs } from '../../db/schema';
import {
  Permissions,
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_BITS_POSITIVE,
  SUPER_ADMIN_ROLE_CODE,
  normalizePermissionBits,
} from '../../db/schema/permissions.enum';
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
  createdAt: Date;
  updatedAt: Date;
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
      .orderBy(roles.sort, roles.createdAt)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: rows.map(toView),
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
