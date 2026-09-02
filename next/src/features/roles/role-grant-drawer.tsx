"use client";

import type { MenuNode, RoleMenuGrant } from "@/lib/api-types";
import type { IconName } from "lucide-react/dynamic";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Skeleton,
  Spinner,
  Typography,
  cn,
  toast,
} from "@heroui/react";
import { ChevronRight, KeyRound, RotateCcw } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useCallback, useMemo, useState } from "react";

import { MENUS_TREE_QUERY_KEY, fetchManageMenuTree } from "../menus/menu-api";

import {
  fetchRoleMenus,
  getRoleErrorMessage,
  roleMenusQueryKey,
  updateRoleMenus,
} from "./role-api";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { ErrorContent } from "@/components/common/error-content/error-content";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";
import { getMenuLabel } from "@/lib/menu-i18n";

/**
 * 角色授权抽屉（迁移自 /react-shadcn roles-permission-dialog，勾选模型为
 * **纯 Antd Tree 语义**：权限位视为叶子菜单的子节点，状态完全由子节点推导）。
 *
 * 语义：
 * - 可见性 = role_menus 中「该菜单有记录」；有声明位的叶子，选中 ⇔ 任一位勾选；
 * - 权限位复选框作为叶子菜单的子行渲染，可选项 = 菜单声明位（node.permissions）
 *   ∩ 权限点枚举（GET /permissions）；
 * - 级联双向生效：勾选节点 → 全子孙菜单可见 + 各叶子声明位全选；
 *   取消节点 → 全子孙不可见 + 位清空；子级部分选中 → 父级半选；
 * - 保存 = PUT 全量替换 role_menus（载荷只含选中节点及其位）。
 *
 * 数据源：GET /menus/tree（全量含停用菜单；要求菜单 SEARCH 位）；注意树节点的
 * userPermissions 是「当前用户」的授权，本弹窗只消费节点声明位 permissions。
 */

export interface RoleGrantDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** 授权目标角色（null = 关闭态；code 用于系统内置角色保护） */
  role: { id: string; name: string; code: string } | null;
  /** 保存成功回调（页面统一失效导航菜单缓存并提示） */
  onSaved: () => void;
}

/** 节点勾选状态 */
type CheckState = "checked" | "indeterminate" | "unchecked";

export function RoleGrantDrawer({
  isOpen,
  onOpenChange,
  role,
  onSaved,
}: RoleGrantDrawerProps) {
  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content placement="right">
        {/* 覆盖默认 w-96：树 + 权限位复选框需要更宽的面板 */}
        <Drawer.Dialog className="w-152 max-w-[85vw]">
          <Drawer.CloseTrigger />
          {/* GrantPanel 统一渲染 Header/Body/Footer（提示与 footer 依赖面板内状态） */}
          {isOpen && role && (
            <GrantPanel
              key={role.id}
              roleCode={role.code}
              roleId={role.id}
              roleName={role.name}
              onDone={() => onOpenChange(false)}
              onSaved={onSaved}
            />
          )}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

interface GrantPanelProps {
  roleId: string;
  /** 授权目标角色名称（标题展示用） */
  roleName: string;
  /** 角色标识：super_admin 为系统内置角色，授权不可修改（保存禁用 + 警示条） */
  roleCode: string;
  onDone: () => void;
  onSaved: () => void;
}

function GrantPanel({
  roleId,
  roleName,
  roleCode,
  onDone,
  onSaved,
}: GrantPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: permissionItems } = usePermissions();

  // 系统内置角色保护：super_admin 的 role_menus 授权是全量权限载体（seed 写入
  // -1n 全量位，登录/每请求实时聚合），改动会让绑定用户立即失去全部权限；
  // 后端 PUT /roles/:id/menus 亦有 403 SUPER_ADMIN_ROLE_PROTECTED 兜底
  const isProtected = roleCode === SUPER_ADMIN_ROLE_CODE;

  // 全量菜单树（含停用/隐藏节点；不带 search 全量拉取）
  const menusQuery = useQuery({
    queryKey: [...MENUS_TREE_QUERY_KEY, ""],
    queryFn: () => fetchManageMenuTree(),
    enabled: true,
    staleTime: 0,
  });
  const menuTree = useMemo(() => menusQuery.data ?? [], [menusQuery.data]);

  // 服务端已授权集合（menuId → permissions 位）。「有记录」= 可见。
  const roleMenusQuery = useQuery({
    queryKey: roleMenusQueryKey(roleId),
    queryFn: () => fetchRoleMenus(roleId),
  });
  const initialAuth = useMemo(() => {
    const next: Record<string, string> = {};

    for (const item of roleMenusQuery.data?.menus ?? []) {
      next[item.menuId] = item.permissions;
    }

    return next;
  }, [roleMenusQuery.data]);

  // 本地修改：可见性 = Record<menuId, boolean>；按钮位 = Record<menuId, string>
  const [visibleOverrides, setVisibleOverrides] = useState<
    Record<string, boolean>
  >({});
  const [bitsOverrides, setBitsOverrides] = useState<Record<string, string>>(
    {},
  );

  // 子树展开状态（缺省视为展开；仅渲染层显隐，不影响勾选状态与保存载荷）
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = useCallback(
    (menuId: string) => expanded[menuId] ?? true,
    [expanded],
  );
  const toggleExpanded = useCallback((menuId: string) => {
    setExpanded((prev) => ({ ...prev, [menuId]: !(prev[menuId] ?? true) }));
  }, []);

  const isVisible = useCallback(
    (menuId: string): boolean =>
      visibleOverrides[menuId] ?? initialAuth[menuId] !== undefined,
    [visibleOverrides, initialAuth],
  );
  const getBits = useCallback(
    (menuId: string): string =>
      bitsOverrides[menuId] ?? initialAuth[menuId] ?? "0",
    [bitsOverrides, initialAuth],
  );

  /** 节点是否有「自身选中」语义：位叶子看位，其余看可见性（载荷/统计口径） */
  function isNodeSelected(node: MenuNode): boolean {
    const children = node.children ?? [];
    const items = children.length === 0 ? declaredItems(node) : [];

    if (items.length > 0) {
      const current = BigInt(getBits(node.id) || "0");

      return items.some(
        (item) => (current & BigInt(item.bits)) === BigInt(item.bits),
      );
    }

    return isVisible(node.id);
  }

  /**
   * 勾选整棵子树（Antd Tree 语义，向下级联双向生效）：
   * - 勾选：全子孙菜单可见 + 各叶子声明位全选；
   * - 取消：全子孙菜单不可见 + 位全部清空（位是菜单的子节点，随父级同步）。
   */
  function setSubtreeChecked(node: MenuNode, checked: boolean) {
    setVisibleOverrides((prev) => ({ ...prev, [node.id]: checked }));
    if (declaredItems(node).length > 0) {
      setBitsOverrides((prev) => ({
        ...prev,
        [node.id]: checked ? node.permissions || "0" : "0",
      }));
    }
    for (const child of node.children ?? []) {
      setSubtreeChecked(child, checked);
    }
  }

  /**
   * 节点勾选状态：**纯由子节点推导**（Antd Tree 语义）——权限位视为叶子的
   * 子节点，与子菜单同等参与：
   * - checked：全部子级（子菜单 + 声明位）checked（无子级无位的叶子看自身可见性）；
   * - indeterminate：子级部分选中；
   * - unchecked：所有子级都未选中。
   */
  function checkState(node: MenuNode): CheckState {
    const children = node.children ?? [];
    const items = children.length === 0 ? declaredItems(node) : [];

    if (children.length === 0 && items.length === 0) {
      return isVisible(node.id) ? "checked" : "unchecked";
    }

    const states: CheckState[] = children.map(checkState);

    if (items.length > 0) {
      const current = BigInt(getBits(node.id) || "0");

      for (const item of items) {
        states.push(
          (current & BigInt(item.bits)) === BigInt(item.bits)
            ? "checked"
            : "unchecked",
        );
      }
    }

    if (states.every((s) => s === "checked")) return "checked";
    if (states.some((s) => s !== "unchecked")) return "indeterminate";

    return "unchecked";
  }

  /** 主勾选切换：未全选（含半选）→ 勾选整棵子树；已全选 → 取消整棵子树 */
  function toggleMaster(node: MenuNode) {
    setSubtreeChecked(node, checkState(node) !== "checked");
  }

  /** 菜单声明位 → 可授权的权限点列表（声明位 ∩ 权限点枚举） */
  const declaredItems = useCallback(
    (node: MenuNode) => {
      let declared: bigint;

      try {
        declared = BigInt(node.permissions || "0");
      } catch {
        return [];
      }
      if (declared === 0n) return [];

      return (permissionItems ?? []).filter((item) => {
        const bits = BigInt(item.bits);

        return bits !== 0n && (declared & bits) === bits;
      });
    },
    [permissionItems],
  );

  /** 已勾选菜单数（checked + 半选均计入，仅统计展示） */
  const selectedCount = useMemo(() => {
    let count = 0;
    const walk = (nodes: MenuNode[]) => {
      for (const node of nodes) {
        if (isNodeSelected(node)) count += 1;
        walk(node.children ?? []);
      }
    };

    walk(menuTree);

    return count;
  }, [menuTree, isVisible]);

  const totalNodes = useMemo(() => {
    const count = (nodes: MenuNode[]): number =>
      nodes.reduce((acc, node) => acc + 1 + count(node.children ?? []), 0);

    return count(menuTree);
  }, [menuTree]);

  /** 全部展开 / 全部收起：展开状态显式覆盖到每一个节点 */
  const setAllExpanded = useCallback(
    (value: boolean) => {
      setExpanded(() => {
        const next: Record<string, boolean> = {};
        const walk = (nodes: MenuNode[]) => {
          for (const node of nodes) {
            next[node.id] = value;
            walk(node.children ?? []);
          }
        };

        walk(menuTree);

        return next;
      });
    },
    [menuTree],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 选中节点全量收集（含半选：部分位勾选的叶子也是「可见」记录）
      const menus: RoleMenuGrant[] = [];
      const walk = (nodes: MenuNode[]) => {
        for (const node of nodes) {
          if (isNodeSelected(node)) {
            menus.push({ menuId: node.id, permissions: getBits(node.id) });
          }
          walk(node.children ?? []);
        }
      };

      walk(menuTree);

      return updateRoleMenus(roleId, menus);
    },
    onSuccess: () => {
      // 授权已变：失效角色授权缓存（本弹窗）+ 导航菜单缓存（后端 /menus
      // 实时计算 userPermissions，若改的是当前用户自己的角色，侧边栏立即生效）
      void queryClient.invalidateQueries({
        queryKey: roleMenusQueryKey(roleId),
        exact: true,
      });
      onSaved();
      toast.success(t("features.roles.grant.saveSuccess"));
      onDone();
    },
    onError: (error) => {
      toast.danger(getRoleErrorMessage(error));
    },
  });

  /**
   * 树形渲染（Antd Tree 风格）：菜单行 = Checkbox + 图标 + 名称（与侧边栏
   * 同构，不展示路由/目录标识）；权限位复选框作为叶子菜单的**子行**渲染。
   * 勾选级联语义见组件顶部注释（菜单与权限位共同参与父子关联）。
   */
  const renderTree = (nodes: MenuNode[], depth: number) =>
    nodes.map((node) => {
      const children = node.children ?? [];
      const hasChildren = children.length > 0;
      const state = checkState(node);
      const leafItems = hasChildren ? [] : declaredItems(node);
      const name = getMenuLabel(node, t);
      // 渲染上的非叶子节点：有子菜单**或**有权限位子行，均可折叠
      const expandable = hasChildren || leafItems.length > 0;
      const expanded = isExpanded(node.id);

      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-2.5 py-1.5"
            style={{ paddingInlineStart: `${depth * 20}px` }}
          >
            {expandable ? (
              <Button
                isIconOnly
                aria-label={t(
                  expanded
                    ? "features.roles.grant.collapse"
                    : "features.roles.grant.expand",
                  { name },
                )}
                className="size-6 shrink-0"
                size="sm"
                variant="ghost"
                onPress={() => toggleExpanded(node.id)}
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform",
                    expanded && "rotate-90",
                  )}
                />
              </Button>
            ) : (
              <span aria-hidden className="size-6 shrink-0" />
            )}
            <Checkbox
              aria-label={t("features.roles.grant.visibleOf", { name })}
              isIndeterminate={state === "indeterminate"}
              isSelected={state === "checked"}
              variant="secondary"
              onChange={() => toggleMaster(node)}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
            {node.icon ? (
              <DynamicIcon
                aria-hidden
                className="size-4 shrink-0 text-muted"
                name={node.icon as IconName}
                size={16}
              />
            ) : null}
            <span className="shrink-0 text-sm font-medium">{name}</span>
            {!node.enabled && (
              <Typography className="shrink-0" color="muted" type="body-xs">
                ({t("features.roles.grant.disabledTag")})
              </Typography>
            )}
          </div>
          {/* 叶子 + 有声明位 → 权限位作为子行渲染（与父行同结构，复选框对齐） */}
          {expanded &&
            leafItems.length > 0 &&
            leafItems.map((item) => {
              const permKey = `features.permissions.items.${item.value}`;
              const permName = t(permKey);
              const display = permName === permKey ? item.label : permName;
              const current = BigInt(getBits(node.id) || "0");
              const itemBits = BigInt(item.bits);
              const checked = (current & itemBits) === itemBits;

              return (
                <div
                  key={item.value}
                  className="flex items-center gap-2.5 py-1"
                  style={{ paddingInlineStart: `${(depth + 1) * 20}px` }}
                >
                  <span aria-hidden className="size-6 shrink-0" />
                  <Checkbox
                    isSelected={checked}
                    variant="secondary"
                    onChange={(selected) => {
                      const base = BigInt(getBits(node.id) || "0");
                      const next = selected
                        ? base | itemBits
                        : base & ~itemBits;

                      setBitsOverrides((prev) => ({
                        ...prev,
                        [node.id]: next.toString(),
                      }));
                      // 位与菜单可见性联动（Antd 向上级联）：
                      // 勾任一位 → 菜单选中；位全部取消 → 菜单未选中
                      const anyLeft =
                        selected ||
                        leafItems.some(
                          (it) =>
                            it.value !== item.value &&
                            (next & BigInt(it.bits)) === BigInt(it.bits),
                        );

                      setVisibleOverrides((prev) => ({
                        ...prev,
                        [node.id]: anyLeft,
                      }));
                    }}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      {item.icon && (
                        <DynamicIcon
                          aria-hidden
                          className="size-3.5 text-muted"
                          name={item.icon as IconName}
                          size={14}
                        />
                      )}
                      <span className="text-xs text-muted">{display}</span>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              );
            })}
          {/* 子菜单子树：仅展开时渲染 */}
          {hasChildren && expanded && renderTree(children, depth + 1)}
        </div>
      );
    });

  const loading = menusQuery.isLoading || roleMenusQuery.isLoading;

  return (
    <>
      {/* 提示统计放 Header：滚动时保持可见 */}
      <Drawer.Header>
        <div className="flex flex-col gap-1">
          <Drawer.Heading className="flex items-center gap-2">
            <KeyRound className="size-5 text-muted" />
            {t("features.roles.grant.title", { name: roleName })}
          </Drawer.Heading>
          <Typography color="muted" type="body-xs">
            {t("features.roles.grant.hint", {
              selected: selectedCount,
              total: totalNodes,
            })}
          </Typography>
        </div>
      </Drawer.Header>

      <Drawer.Body>
        <div className="flex flex-col gap-3">
          {isProtected && (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>
                  {t("features.roles.grant.protectedTitle")}
                </Alert.Title>
                <Alert.Description>
                  {t("features.roles.grant.protected")}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {loading ? (
            // 骨架屏：按树形缩进占位，回显前与真实结构层级一致
            <div className="flex flex-col gap-2 py-1">
              {[0, 1, 1, 2, 2, 2, 1, 2].map((indent, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 py-1"
                  style={{ paddingInlineStart: `${indent * 20}px` }}
                >
                  <Skeleton className="size-4 rounded-md" />
                  <Skeleton
                    className="h-3.5 rounded-md"
                    style={{ width: `${88 - indent * 12}px` }}
                  />
                </div>
              ))}
            </div>
          ) : menusQuery.isError || roleMenusQuery.isError ? (
            // 错误态：与空数据区分（典型为无菜单 SEARCH 位被 403、网络异常）
            <ErrorContent
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    if (menusQuery.isError) void menusQuery.refetch();
                    if (roleMenusQuery.isError) void roleMenusQuery.refetch();
                  }}
                >
                  <RotateCcw className="size-4" />
                  {t("common.retry")}
                </Button>
              }
              description={getRoleErrorMessage(
                menusQuery.error ?? roleMenusQuery.error,
              )}
              title={t("features.roles.grant.loadError")}
            />
          ) : menuTree.length === 0 ? (
            <EmptyContent title={t("features.roles.grant.noMenus")} />
          ) : (
            <div className="flex flex-col">{renderTree(menuTree, 0)}</div>
          )}
        </div>
      </Drawer.Body>

      <Drawer.Footer className="justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            isDisabled={loading || menuTree.length === 0}
            size="sm"
            variant="tertiary"
            onPress={() => setAllExpanded(false)}
          >
            {t("features.roles.grant.collapseAll")}
          </Button>
          <Button
            isDisabled={loading || menuTree.length === 0}
            size="sm"
            variant="tertiary"
            onPress={() => setAllExpanded(true)}
          >
            {t("features.roles.grant.expandAll")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isDisabled={saveMutation.isPending}
            slot="close"
            variant="secondary"
          >
            {t("common.cancel")}
          </Button>
          <Button
            isDisabled={loading || isProtected}
            isPending={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          >
            {({ isPending }) =>
              isPending ? (
                <>
                  <Spinner color="current" size="sm" />
                  {t("features.roles.grant.saving")}
                </>
              ) : (
                t("features.roles.grant.save")
              )
            }
          </Button>
        </div>
      </Drawer.Footer>
    </>
  );
}
