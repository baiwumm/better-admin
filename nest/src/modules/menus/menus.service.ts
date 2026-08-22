import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { menus, roleMenus, userRoles, logs } from '../../db/schema';
import { normalizePermissionBits } from '../../db/schema/permissions.enum';
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
  target: string;
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
    target: row.target,
    permissions: row.permissions.toString(),
  };
}

@Injectable()
export class MenusService {
  /**
   * 一次性查询当前用户所有角色的 role_menus，聚合为 Map<menuId, permissions>。
   * 严格遵循 database-design.md §1.5：仅 1 次查询，禁止 N+1。
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

  /** 将扁平菜单列表在内存中递归组装成树（children 按 sort 排序） */
  private buildTree(rows: (typeof menus.$inferSelect)[], permMap: Map<string, bigint>): MenuNode[] {
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
      list.sort((a, b) => a.sort - b.sort);
      for (const n of list) sortRec(n.children);
    };
    sortRec(roots);
    return roots;
  }

  /** GET /api/menus — 菜单树（含 userPermissions 实际授权位） */
  async findTree(user: AuthUser | null) {
    const rows = await db
      .select()
      .from(menus)
      .orderBy(menus.sort, menus.createdAt);

    const permMap = user ? await this.buildPermissionMap(user.id) : new Map<string, bigint>();
    return this.buildTree(rows, permMap);
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

  private async createMenu(dto: CreateMenuDto, operatorId: string | null) {
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
        target: dto.target ?? '_self',
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
        target: dto.target ?? existing.target,
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
