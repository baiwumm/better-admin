import type { MenuNode, PermissionItem, RoleMenuGrant } from "@/lib/api-types";

import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";

import {
  MENUS_TREE_QUERY_KEY,
  fetchManageMenuTree,
} from "@/features/menus/menu-api";

import { usePermissions } from "@/composables/use-permissions";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";

import { fetchRoleMenus } from "./role-api";

/**
 * UTree 节点类型：独立定义（结构兼容 Nuxt UI 的 TreeItem），不继承其
 * index-signature 接口，避免联合访问时 children 被拓宽、类型递归展开。
 */
/** UTree 菜单节点（key = menuId） */
export interface GrantMenuTreeItem {
  kind: "menu";
  key: string;
  label: string;
  icon?: string;
  node: MenuNode;
  /** 叶子菜单的权限位子行；目录恒空（React 基准口径：位子行只在叶子渲染） */
  bitItems: GrantBitTreeItem[];
  /** 声明位 ∩ 权限点枚举非空（对应 React declaredItems 口径，交互/保存用） */
  hasDeclaredBits: boolean;
  parent?: GrantMenuTreeItem;
  children?: GrantTreeItem[];
}

/** UTree 权限位节点：叶子菜单的虚拟子节点（key = `${menuId}:${item.value}`） */
export interface GrantBitTreeItem {
  kind: "bit";
  key: string;
  label: string;
  icon?: string;
  bits: number;
  menuKey: string;
  parent: GrantMenuTreeItem;
  children?: undefined;
}

export type GrantTreeItem = GrantMenuTreeItem | GrantBitTreeItem;

/**
 * 角色授权树状态（Nuxt UI UTree 集合模型）。
 *
 * 勾选语义对齐 React 端（Antd Tree 模型，权限位视为叶子菜单的子节点）：
 * - 「在选中集合 ⇔ 全选态」不变式：半选 = 不在集合且后代部分选中
 *   （isIndeterminate 由 reka-ui bubble-select 推导，仅用于显示）；
 * - toggleItem：未全选 → 勾选整棵子树（向下传播 + 向上冒泡），已全选 → 取消
 *   整棵子树，等价 React toggleMaster。级联手写而不用 reka 内建
 *   propagate/bubble：所有 select 事件都被拦截（见 RoleGrantDrawer），内建
 *   级联不会触发；且载荷口径需要区分「显式勾选」与「冒泡推导」；
 * - explicitVisibility / touchedBits 对应 React visibleOverrides /
 *   bitsOverrides：载荷只含「显式勾选传播到的节点 + 服务端已有记录」，
 *   冒泡推导入集合的父级仅影响显示、不入载荷（不给无记录目录凭空补记录）；
 * - 保存 = PUT 全量替换 role_menus（载荷只含选中节点及其位）。
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
    queryFn: () => fetchRoleMenus(roleId()),
  });

  /** 服务端已授权集合（menuId → permissions 位）。「有记录」= 可见。 */
  const initialAuth = computed<Record<string, string>>(() => {
    const next: Record<string, string> = {};

    for (const item of roleMenusQuery.data.value?.menus ?? []) {
      next[item.menuId] = item.permissions;
    }

    return next;
  });

  // ------------------------------------------------------------------
  // UTree items 构建：菜单 → TreeItem；叶子菜单声明位 → 虚拟位子节点
  // ------------------------------------------------------------------

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

  function buildBitItems(
    node: MenuNode,
    parent: GrantMenuTreeItem,
  ): GrantBitTreeItem[] {
    return declaredItems(node).map((item) => ({
      kind: "bit",
      key: `${node.id}:${item.value}`,
      label: permissionLabel(item),
      icon: item.icon ? `i-lucide-${item.icon}` : undefined,
      bits: item.bits,
      menuKey: node.id,
      parent,
    }));
  }

  const treeItems = computed<GrantTreeItem[]>(() => {
    const build = (
      nodes: MenuNode[],
      parent?: GrantMenuTreeItem,
    ): GrantMenuTreeItem[] =>
      nodes.map((node) => {
        const item: GrantMenuTreeItem = {
          kind: "menu",
          key: node.id,
          label: node.i18nKey ? t(node.i18nKey) : node.label,
          icon: node.icon ? `i-lucide-${node.icon}` : undefined,
          node,
          bitItems: [],
          hasDeclaredBits: declaredItems(node).length > 0,
          parent,
        };

        const childMenus = build(node.children ?? [], item);

        item.bitItems =
          childMenus.length === 0 ? buildBitItems(node, item) : [];
        item.children =
          childMenus.length > 0
            ? childMenus
            : item.bitItems.length > 0
              ? item.bitItems
              : undefined;

        return item;
      });

    return build(menuTree.value);
  });

  /** 扁平菜单节点列表（统计/保存遍历用，不含位节点） */
  const menuItemsFlat = computed<GrantMenuTreeItem[]>(() => {
    const list: GrantMenuTreeItem[] = [];

    const walk = (items: GrantTreeItem[]) => {
      for (const item of items) {
        if (item.kind === "menu") {
          list.push(item);
          walk(item.children ?? []);
        }
      }
    };

    walk(treeItems.value);

    return list;
  });

  function menuChildren(item: GrantMenuTreeItem): GrantMenuTreeItem[] {
    return (item.children ?? []).filter(
      (child): child is GrantMenuTreeItem => child.kind === "menu",
    );
  }

  // ------------------------------------------------------------------
  // 选中集合（UTree v-model）：唯一显示源；不变式「在集合 ⇔ 全选态」
  // ------------------------------------------------------------------

  const selectedItems = ref<GrantTreeItem[]>([]);
  const expandedKeys = ref<string[]>([]);

  const selectedKeys = computed(
    () => new Set(selectedItems.value.map((item) => item.key)),
  );

  /**
   * 本地显式修改覆盖层（对应 React visibleOverrides / bitsOverrides）：
   * 未覆盖时回退服务端初始授权。回显重建时清空。
   */
  const explicitVisibility = reactive<Record<string, boolean>>({});
  const touchedBits = reactive<Record<string, string>>({});

  const isBitSelected = (bit: GrantBitTreeItem): boolean => {
    const current = initialAuth.value[bit.menuKey];

    if (current === undefined) return false;

    return (BigInt(current) & BigInt(bit.bits)) === BigInt(bit.bits);
  };

  const selectionReady = ref(false);

  /** 回显：从服务端授权构建初始集合 + 全量展开（React「缺省展开」语义） */
  function buildSelectionFromServer() {
    const auth = initialAuth.value;
    const selected = new Set<string>();
    const expanded: string[] = [];

    // 自底向上（对齐 React checkState 纯子级推导）：目录入集合 ⇔ 直接子级全入
    const build = (items: GrantMenuTreeItem[]) => {
      for (const item of items) {
        const childMenus = menuChildren(item);

        build(childMenus);

        if (item.bitItems.length > 0) {
          // 叶子有声明位：位全勾 ⇔ 全选（React 纯位推导）
          let allBitsChecked = true;

          for (const bit of item.bitItems) {
            if (isBitSelected(bit)) selected.add(bit.key);
            else allBitsChecked = false;
          }
          if (allBitsChecked && item.bitItems.length > 0) {
            selected.add(item.key);
          }
        } else if (childMenus.length > 0) {
          // 目录：纯子级推导（React checkState 不看目录自身可见性）
          if (childMenus.every((child) => selected.has(child.key))) {
            selected.add(item.key);
          }
        } else if (auth[item.key] !== undefined) {
          // 无位叶子：有记录即选中（React isVisible）
          selected.add(item.key);
        }

        if (item.children?.length) expanded.push(item.key);
      }
    };

    build(treeItems.value as GrantMenuTreeItem[]);

    // 选中对象按树序收集（菜单与位子行统一 walk）
    const collect = (items: GrantTreeItem[]) => {
      const picked: GrantTreeItem[] = [];

      const walk = (it: GrantTreeItem) => {
        if (selected.has(it.key)) picked.push(it);
        for (const child of it.children ?? []) walk(child);
      };

      for (const item of items) walk(item);

      return picked;
    };

    selectedItems.value = collect(treeItems.value);
    expandedKeys.value = expanded;

    explicitVisibilityClear();
    touchedBitsClear();
    selectionReady.value = true;
  }

  function explicitVisibilityClear() {
    for (const key of Object.keys(explicitVisibility)) {
      delete explicitVisibility[key];
    }
  }

  function touchedBitsClear() {
    for (const key of Object.keys(touchedBits)) {
      delete touchedBits[key];
    }
  }

  /**
   * 打开抽屉时调用（等价 React GrantPanel key={role.id} 重建）：
   * 标记待回显；数据可用（含缓存）则立即回显，避免 staleTime=0 的
   * refetch 期间渲染全空树；缓存为空时由 watch 在数据到位后回显。
   */
  function resetSelection() {
    selectionReady.value = false;
    selectedItems.value = [];
    expandedKeys.value = [];

    if (menuTree.value.length > 0 && roleMenusQuery.data.value) {
      buildSelectionFromServer();
    }
  }

  // 数据（菜单树 / 角色授权）到位且未回显 → 回显（覆盖打开抽屉时数据仍在加载的情况）
  watch(
    [treeItems, roleMenusQuery.data, menusQuery.data],
    () => {
      if (selectionReady.value) return;
      if (!menusQuery.isSuccess.value || !roleMenusQuery.isSuccess.value) {
        return;
      }

      buildSelectionFromServer();
    },
    { immediate: true },
  );

  // ------------------------------------------------------------------
  // 勾选级联（对齐 React toggleMaster / setSubtreeChecked）
  // ------------------------------------------------------------------

  /**
   * 勾选/取消（checkbox 与键盘 Enter/Space 统一入口）：
   * 未全选（含半选）→ 勾选整棵子树；已全选 → 取消整棵子树。
   */
  function toggleItem(item: GrantTreeItem) {
    if (selectedKeys.value.has(item.key)) {
      removeSubtree(item);
      applySubtreeOverrides(item, false);
    } else {
      addSubtree(item);
      applySubtreeOverrides(item, true);
    }
  }

  /** 向下全子孙入集合 + 向上「直接子级全选」冒泡（React checkState 纯子级推导） */
  function addSubtree(item: GrantTreeItem) {
    const keys = new Set(selectedItems.value.map((i) => i.key));
    const added: GrantTreeItem[] = [];

    const walkDown = (it: GrantTreeItem) => {
      if (!keys.has(it.key)) {
        keys.add(it.key);
        added.push(it);
      }
      for (const child of it.children ?? []) walkDown(child);
    };

    walkDown(item);

    let parent = item.parent;

    while (parent) {
      const children = parent.children ?? [];

      if (children.length > 0 && children.every((c) => keys.has(c.key))) {
        if (!keys.has(parent.key)) {
          keys.add(parent.key);
          added.push(parent);
        }
        parent = parent.parent;
      } else {
        break;
      }
    }

    if (added.length > 0)
      selectedItems.value = [...selectedItems.value, ...added];
  }

  /** 向下全子孙移出 + 向上父链移出（item 移出后父级「全选」不变式逐层失效） */
  function removeSubtree(item: GrantTreeItem) {
    const removedKeys = new Set<string>();

    const walkDown = (it: GrantTreeItem) => {
      removedKeys.add(it.key);
      for (const child of it.children ?? []) walkDown(child);
    };

    walkDown(item);

    let parent = item.parent;

    while (parent) {
      removedKeys.add(parent.key);
      parent = parent.parent;
    }

    selectedItems.value = selectedItems.value.filter(
      (i) => !removedKeys.has(i.key),
    );
  }

  /**
   * 显式覆盖层（对齐 React setSubtreeChecked）：从被点节点向下传播——
   * 每个菜单节点记可见性，有声明位的节点另记位覆盖。冒泡推导的父级不写
   * （对应 React bubble 为纯显示推导）。
   */
  function applySubtreeOverrides(item: GrantTreeItem, checked: boolean) {
    const walk = (it: GrantTreeItem) => {
      if (it.kind === "menu") {
        explicitVisibility[it.key] = checked;
        if (it.hasDeclaredBits) {
          touchedBits[it.key] = checked ? it.node.permissions || "0" : "0";
        }
      }
      for (const child of it.children ?? []) walk(child);
    };

    walk(item);
  }

  // ------------------------------------------------------------------
  // 统计 / 保存（对齐 React isNodeSelected / getBits 载荷口径）
  // ------------------------------------------------------------------

  /** 已勾选菜单数（checked + 半选均计入，仅统计展示） */
  const selectedCount = computed(() => {
    const auth = initialAuth.value;
    let count = 0;

    for (const item of menuItemsFlat.value) {
      if (item.bitItems.length > 0) {
        if (item.bitItems.some((bit) => selectedKeys.value.has(bit.key))) {
          count += 1;
        }
      } else if (explicitVisibility[item.key] ?? auth[item.key] !== undefined) {
        count += 1;
      }
    }

    return count;
  });

  const totalNodes = computed(() => menuItemsFlat.value.length);

  /** 保存载荷：选中节点全量收集（含半选叶子：部分位勾选也是「可见」记录） */
  function buildMenusPayload(): RoleMenuGrant[] {
    const auth = initialAuth.value;
    const menus: RoleMenuGrant[] = [];

    for (const item of menuItemsFlat.value) {
      if (item.bitItems.length > 0) {
        // 叶子有声明位：任一位勾选 → 保存；permissions = 选中位 OR 聚合
        let bits = 0n;

        for (const bit of item.bitItems) {
          if (selectedKeys.value.has(bit.key)) bits |= BigInt(bit.bits);
        }

        if (bits !== 0n) {
          menus.push({ menuId: item.node.id, permissions: bits.toString() });
        }
      } else {
        const visible =
          explicitVisibility[item.key] ?? auth[item.key] !== undefined;

        if (visible) {
          menus.push({
            menuId: item.node.id,
            permissions: touchedBits[item.key] ?? auth[item.key] ?? "0",
          });
        }
      }
    }

    return menus;
  }

  /** 全部展开 / 全部收起 */
  function setAllExpanded(value: boolean) {
    expandedKeys.value = value
      ? menuItemsFlat.value
          .filter((item) => item.children?.length)
          .map((item) => item.key)
      : [];
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
    treeItems,
    selectedItems,
    expandedKeys,
    toggleItem,
    setAllExpanded,
    buildMenusPayload,
    resetSelection,
    isProtected,
    loading,
    loadError,
    selectedCount,
    totalNodes,
    refetch,
  };
}

export type GrantTreeContext = ReturnType<typeof useGrantTree>;
