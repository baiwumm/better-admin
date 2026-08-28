import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { count, eq, ilike, or } from 'drizzle-orm';
import { db } from '../../db/client';
import { menus, roleMenus, userRoles, logs } from '../../db/schema';
import {
  normalizePermissionBits,
  SUPER_ADMIN_BITS_POSITIVE,
} from '../../db/schema/permissions.enum';
import { CreateMenuDto } from './dto/menu-create.dto';
import { UpdateMenuDto } from './dto/menu-update.dto';
import { AddChildDto } from './dto/menu-add-child.dto';
import { AuthUser } from '../../auth/auth.service';

export type MenuNode = {
  id: string;
  label: string;
  i18nKey: string | null;
  icon: string;
  to: string | null;
  parentId: string | null;
  sort: number;
  keepAlive: boolean;
  hideInMenu: boolean;
  enabled: boolean;
  defaultOpen: boolean;
  permissions: string;
  userPermissions: string | null;
  children: MenuNode[];
};

function rowToBase(row: typeof menus.$inferSelect) {
  return {
    id: row.id,
    label: row.label,
    i18nKey: row.i18nKey,
    icon: row.icon,
    to: row.to,
    parentId: row.parentId,
    sort: row.sort,
    keepAlive: row.keepAlive,
    hideInMenu: row.hideInMenu,
    enabled: row.enabled,
    defaultOpen: row.defaultOpen,
    permissions: row.permissions.toString(),
  };
}

@Injectable()
export class MenusService {
  /**
   * 一次性查询当前用户所有角色的 role_menus，聚合为 Map<menuId, permissions>。
   * 仅 1 次查询，严格禁止 N+1（database-design.md §1.5）。
   */
  private async buildPermissionMap(userId: string): Promise<Map<string, bigint>> {
    const rows = await db
      .select({ menuId: roleMenus.menuId, bits: roleMenus.permissions })
      .from(roleMenus)
      .innerJoin(userRoles, eq(roleMenus.roleId, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

    const map = new Map<string, bigint>();
    for (const r of rows) {
      map.set(r.menuId, (map.get(r.menuId) ?? 0n) | r.bits);
    }
    return map;
  }

  /**
   * 计算当前用户可访问的菜单 id 集合（含祖先链）。
   *
   * - super_admin（permissions = 全量掩码 9223372036854775807）：返回 null 表示
   *   「全量可见」，跳过过滤，直接返回完整菜单树。
   * - 普通用户：取其在 role_menus 中「直接授权」的 menu_id 集合，
   *   再向上追溯 parent_id 将祖先节点纳入可见范围（保证树形结构完整）。
   *
   * 依据 database-design.md §1.5：菜单可见性由角色关联决定，
   * 未关联的菜单节点不应出现在返回树中。
   *
   * @returns 可见菜单 id 集合；null 表示不限制（全量）
   */
  private async buildAllowedMenuIds(user: AuthUser): Promise<Set<string> | null> {
    // super_admin 免过滤：聚合权限位为全量掩码（对外正数表示）
    if (BigInt(user.permissions) === SUPER_ADMIN_BITS_POSITIVE) {
      return null;
    }

    // 直接授权集合：用户所有角色在 role_menus 中关联的 menu_id（去重）
    const directRows = await db
      .selectDistinct({ menuId: roleMenus.menuId })
      .from(roleMenus)
      .innerJoin(userRoles, eq(roleMenus.roleId, userRoles.roleId))
      .where(eq(userRoles.userId, user.id));

    const directIds = new Set(directRows.map((r) => r.menuId));
    if (directIds.size === 0) {
      // 未授权任何菜单 → 返回空集合（侧边栏无菜单）
      return directIds;
    }

    // 一次性取全量菜单用于追溯祖先链（常数次查询，无 N+1）
    const allRows = await db.select().from(menus);
    const byId = new Map(allRows.map((m) => [m.id, m]));

    const allowed = new Set(directIds);
    for (const id of directIds) {
      let cur = byId.get(id);
      while (cur && cur.parentId) {
        if (allowed.has(cur.parentId)) break;
        allowed.add(cur.parentId);
        cur = byId.get(cur.parentId);
      }
    }
    return allowed;
  }

  /** 将扁平菜单列表在内存中递归组装成树（children 按 sort 排序，方向可配） */
  private buildTree(
    rows: (typeof menus.$inferSelect)[],
    permMap: Map<string, bigint>,
    order: 'asc' | 'desc' = 'asc',
  ): MenuNode[] {
    const nodes = new Map<string, MenuNode>();
    for (const row of rows) {
      nodes.set(row.id, {
        ...rowToBase(row),
        userPermissions: permMap.has(row.id)
          ? normalizePermissionBits(permMap.get(row.id)!).toString()
          : null,
        children: [],
      });
    }
    const roots: MenuNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortRec = (list: MenuNode[]) => {
      list.sort((a, b) => (order === 'desc' ? b.sort - a.sort : a.sort - b.sort));
      for (const n of list) sortRec(n.children);
    };
    sortRec(roots);
    return roots;
  }

  /**
   * GET /api/menus — 菜单树（含 userPermissions 实际授权位）。
   *
   * 可见性由角色关联决定（database-design.md §1.5）：
   * - 未登录：返回空数组（前端路由守卫已拦截，防御性兜底）。
   * - super_admin：返回完整菜单树。
   * - 普通用户：仅返回其角色关联菜单（含祖先链）组成的树；
   *   未关联的菜单节点不出现在返回树中。
   */
  async findTree(user: AuthUser | null) {
    if (!user) {
      return [];
    }

    const allowedIds = await this.buildAllowedMenuIds(user);
    const rows = await db
      .select()
      .from(menus)
      .orderBy(menus.sort, menus.createdAt);

    const filteredRows =
      allowedIds === null ? rows : rows.filter((r) => allowedIds.has(r.id));

    const permMap = await this.buildPermissionMap(user.id);
    return this.buildTree(filteredRows, permMap);
  }

  /**
   * GET /api/menus/tree — 管理用全量菜单树（契约 v1.3 新增）。
   *
   * 与 findTree 的区别：不做角色可见性过滤——包含 enabled=false / hideInMenu
   * 的全部节点，供菜单管理页编辑使用；userPermissions 仍按当前用户下发，
   * 供前端操作按钮门控。控制器层要求菜单 SEARCH 位。
   */
  async findManageTree(
    user: AuthUser | null,
    search?: string,
    order: 'asc' | 'desc' = 'asc',
  ): Promise<MenuNode[]> {
    const allRows = await db.select().from(menus);

    let rows = allRows;
    const normalized = search?.trim();

    if (normalized) {
      const pattern = `%${normalized}%`;
      // 后端模糊搜索：label / i18n_key / to 命中即保留，并回溯祖先链保证树完整
      const matched = await db
        .select({ id: menus.id })
        .from(menus)
        .where(
          or(
            ilike(menus.label, pattern),
            ilike(menus.i18nKey, pattern),
            ilike(menus.to, pattern),
          ),
        );
      const matchedIds = new Set(matched.map((r) => r.id));

      if (matchedIds.size > 0) {
        const byId = new Map(allRows.map((m) => [m.id, m]));
        const allowed = new Set(matchedIds);

        for (const id of matchedIds) {
          let cur = byId.get(id);
          while (cur?.parentId) {
            if (allowed.has(cur.parentId)) break;
            allowed.add(cur.parentId);
            cur = byId.get(cur.parentId);
          }
        }
        rows = allRows.filter((r) => allowed.has(r.id));
      } else {
        rows = [];
      }
    }

    const permMap = user
      ? await this.buildPermissionMap(user.id)
      : new Map<string, bigint>();
    return this.buildTree(rows, permMap, order);
  }

  /** GET /api/menus/:id — 单菜单详情（含子树与 userPermissions） */
  async findOne(id: string, user: AuthUser | null) {
    const row = await db.query.menus.findFirst({ where: eq(menus.id, id) });
    if (!row) {
      throw new NotFoundException({
        code: 'MENU_NOT_FOUND',
        message: '菜单不存在',
      });
    }
    const permMap = user ? await this.buildPermissionMap(user.id) : new Map<string, bigint>();
    const tree = this.buildTree([row], permMap);
    return tree[0];
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
       
      console.error('[menus] 写入日志失败:', err);
    }
  }

  /** to 非空时校验格式：必须以 / 或 https:// 开头（契约 v1.3） */
  private assertValidTo(to: string | null | undefined) {
    if (!to) return;
    if (!to.startsWith('/') && !to.startsWith('https://')) {
      throw new BadRequestException({
        code: 'MENU_TO_INVALID',
        message: '路由路径必须以 / 或 https:// 开头',
      });
    }
  }

  /** to 非空时全局唯一（update 场景排除自身），部分唯一索引兜底（契约 v1.3） */
  private async assertToUnique(to: string | null | undefined, excludeId?: string) {
    if (!to) return;
    const rows = await db
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.to, to));

    if (rows.some((r) => r.id !== excludeId)) {
      throw new ConflictException({
        code: 'MENU_TO_EXISTS',
        message: '路由路径已存在',
      });
    }
  }

  private async createMenu(dto: CreateMenuDto, operatorId: string | null) {
    this.assertValidTo(dto.to);
    await this.assertToUnique(dto.to ?? null);
    const [row] = await db
      .insert(menus)
      .values({
        label: dto.label,
        i18nKey: dto.i18nKey ?? null,
        icon: dto.icon,
        to: dto.to ?? null,
        parentId: dto.parentId ?? null,
        sort: dto.sort ?? 0,
        keepAlive: dto.keepAlive ?? false,
        hideInMenu: dto.hideInMenu ?? false,
        enabled: dto.enabled ?? true,
        defaultOpen: dto.defaultOpen ?? false,
        permissions: BigInt(dto.permissions ?? '0'),
      })
      .returning();
    await this.writeLog('menu.create', operatorId, { id: row.id });
    return rowToBase(row);
  }

  /** POST /api/menus */
  async create(dto: CreateMenuDto, operatorId: string | null) {
    return this.createMenu(dto, operatorId);
  }

  /** POST /api/menus/:id/add-child */
  async addChild(parentId: string, dto: AddChildDto, operatorId: string | null) {
    const parent = await db.query.menus.findFirst({ where: eq(menus.id, parentId) });
    if (!parent) {
      throw new NotFoundException({
        code: 'MENU_NOT_FOUND',
        message: '父菜单不存在',
      });
    }
    return this.createMenu({ ...dto, parentId }, operatorId);
  }

  /** PUT /api/menus/:id */
  async update(id: string, dto: UpdateMenuDto, operatorId: string | null) {
    const existing = await db.query.menus.findFirst({ where: eq(menus.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'MENU_NOT_FOUND',
        message: '菜单不存在',
      });
    }
    const effectiveTo = dto.to === undefined ? existing.to : dto.to;

    this.assertValidTo(effectiveTo);
    await this.assertToUnique(effectiveTo ?? null, id);
    const [row] = await db
      .update(menus)
      .set({
        label: dto.label ?? existing.label,
        i18nKey: dto.i18nKey ?? existing.i18nKey,
        icon: dto.icon ?? existing.icon,
        to: dto.to === undefined ? existing.to : dto.to,
        parentId: dto.parentId ?? existing.parentId,
        sort: dto.sort ?? existing.sort,
        keepAlive: dto.keepAlive ?? existing.keepAlive,
        hideInMenu: dto.hideInMenu ?? existing.hideInMenu,
        enabled: dto.enabled ?? existing.enabled,
        defaultOpen: dto.defaultOpen ?? existing.defaultOpen,
        permissions:
          dto.permissions === undefined ? existing.permissions : BigInt(dto.permissions),
      })
      .where(eq(menus.id, id))
      .returning();
    await this.writeLog('menu.update', operatorId, { id });
    return rowToBase(row);
  }

  /** DELETE /api/menus/:id — 有子菜单则禁止删除 */
  async remove(id: string, operatorId: string | null) {
    const existing = await db.query.menus.findFirst({ where: eq(menus.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'MENU_NOT_FOUND',
        message: '菜单不存在',
      });
    }
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(menus)
      .where(eq(menus.parentId, id));
    if (cnt > 0) {
      throw new ConflictException({
        code: 'MENU_HAS_CHILDREN',
        message: '该菜单存在子菜单，无法删除',
      });
    }
    await db.delete(menus).where(eq(menus.id, id));
    await this.writeLog('menu.delete', operatorId, { id });
    return null;
  }
}
