import type { MenuNode, PermissionItem } from "@/lib/api-types";

import { computed, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";

import {
  MENUS_TREE_QUERY_KEY,
  fetchManageMenuTree,
} from "@/features/menus/menu-api";

import { usePermissions } from "@/composables/use-permissions";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";

/**
 * 角色授权树状态（Antd Tree 勾选模型，供 RoleGrantDrawer 与递归的
 * GrantTreeNode 共享；语义注释见 RoleGrantDrawer.vue）。
 */
export function useGrantTree(roleId: () => string, roleCode: () => string) {
  const { t } = useI18n();
  const { data: permissionItems } = usePermissions();

  const isProtected = computed(() => roleCode() === SUPER_ADMIN_ROLE_CODE);

  const menusQuery = useQuery({
    queryKey: [...MENUS_TREE_QUERY_KEY, ""],
    queryFn: () => fetchManageMenuTree(),
    staleTime: 0,
  });
  const menuTree = computed(() => menusQuery.data.value ?? []);

  const roleMenusQuery = useQuery({
    queryKey: computed(() => ["roles", roleId(), "menus"] as const),
    queryFn: () => fetchRoleMenusById(roleId()),
  });

  // 本地修改覆盖层：未覆盖时回退服务端初始授权
  const overrides = reactive({
    visible: {} as Record<string, boolean>,
    bits: {} as Record<string, string>,
  });
  const expanded = reactive<Record<string, boolean>>({});

  function resetOverrides() {
    overrides.visible = {};
    overrides.bits = {};

    for (const key of Object.keys(expanded)) {
      delete expanded[key];
    }
  }

  const initialAuth = computed<Record<string, string>>(() => {
    const next: Record<string, string> = {};

    for (const item of roleMenusQuery.data.value?.menus ?? []) {
      next[item.menuId] = item.permissions;
    }

    return next;
  });

  function isVisible(menuId: string): boolean {
    return overrides.visible[menuId] ?? initialAuth.value[menuId] !== undefined;
  }

  function getBits(menuId: string): string {
    return overrides.bits[menuId] ?? initialAuth.value[menuId] ?? "0";
  }

  function isExpanded(menuId: string): boolean {
    return expanded[menuId] ?? true;
  }

  function toggleExpanded(menuId: string) {
    expanded[menuId] = !(expanded[menuId] ?? true);
  }

  /** 菜单声明位 → 可授权的权限点列表（声明位 ∩ 权限点枚举） */
  function declaredItems(node: MenuNode): PermissionItem[] {
    let declared: bigint;

    try {
      declared = BigInt(node.permissions || "0");
    } catch {
      return [];
    }
    if (declared === 0n) return [];

    return (permissionItems.value ?? []).filter((item) => {
      const bits = BigInt(item.bits);

      return bits !== 0n && (declared & bits) === bits;
    });
  }

  /** 节点是否有「自身选中」语义：位叶子看位，其余看可见性 */
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

  /** 勾选/取消整棵子树（向下级联双向生效） */
  function setSubtreeChecked(node: MenuNode, checked: boolean) {
    overrides.visible[node.id] = checked;

    if (declaredItems(node).length > 0) {
      overrides.bits[node.id] = checked ? node.permissions || "0" : "0";
    }

    for (const child of node.children ?? []) {
      setSubtreeChecked(child, checked);
    }
  }

  type CheckState = "checked" | "indeterminate" | "unchecked";

  /** 节点勾选状态：纯由子节点推导（权限位视为叶子的子节点） */
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

  function toggleMaster(node: MenuNode) {
    setSubtreeChecked(node, checkState(node) !== "checked");
  }

  /** 位复选框切换：OR/AND 位运算 + 位与菜单可见性联动（向上级联） */
  function togglePermissionBit(
    node: MenuNode,
    item: PermissionItem,
    checked: boolean,
  ) {
    const base = BigInt(getBits(node.id) || "0");
    const itemBits = BigInt(item.bits);
    const next = checked ? base | itemBits : base & ~itemBits;

    overrides.bits[node.id] = next.toString();

    const anyLeft = declaredItems(node).some(
      (it) => (next & BigInt(it.bits)) === BigInt(it.bits),
    );

    overrides.visible[node.id] = anyLeft;
  }

  const selectedCount = computed(() => {
    let count = 0;

    const walk = (nodes: MenuNode[]) => {
      for (const node of nodes) {
        if (isNodeSelected(node)) count += 1;
        walk(node.children ?? []);
      }
    };

    walk(menuTree.value);

    return count;
  });

  const totalNodes = computed(() => {
    const count = (nodes: MenuNode[]): number =>
      nodes.reduce((acc, node) => acc + 1 + count(node.children ?? []), 0);

    return count(menuTree.value);
  });

  function setAllExpanded(value: boolean) {
    const walk = (nodes: MenuNode[]) => {
      for (const node of nodes) {
        expanded[node.id] = value;
        walk(node.children ?? []);
      }
    };

    walk(menuTree.value);
  }

  const loading = computed(
    () => menusQuery.isLoading.value || roleMenusQuery.isLoading.value,
  );
  const loadError = computed(
    () => menusQuery.error.value ?? roleMenusQuery.error.value,
  );

  function refetch() {
    if (menusQuery.error.value) void menusQuery.refetch();
    if (roleMenusQuery.error.value) void roleMenusQuery.refetch();
  }

  /** 权限点名（i18n 优先，回退后端 label） */
  function permissionLabel(item: PermissionItem): string {
    const key = `features.permissions.items.${item.value}`;
    const translated = t(key);

    return translated === key ? item.label : translated;
  }

  return {
    menuTree,
    isProtected,
    loading,
    loadError,
    selectedCount,
    totalNodes,
    isVisible,
    getBits,
    isExpanded,
    toggleExpanded,
    declaredItems,
    isNodeSelected,
    checkState,
    toggleMaster,
    togglePermissionBit,
    setAllExpanded,
    resetOverrides,
    refetch,
    permissionLabel,
  };
}

export type GrantTreeContext = ReturnType<typeof useGrantTree>;

import { fetchRoleMenus } from "./role-api";

function fetchRoleMenusById(roleId: string) {
  return fetchRoleMenus(roleId);
}
