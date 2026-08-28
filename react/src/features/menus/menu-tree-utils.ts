import type { MenuNode } from "@/lib/api-types";

/**
 * 菜单树的纯函数工具（供树形表格与表单消费，便于单测）。
 */

/** 前端过滤：命中 label / i18nKey / to 的节点保留，其祖先链自动保留 */
export function filterMenuTree(nodes: MenuNode[], keyword: string): MenuNode[] {
  const normalized = keyword.trim().toLowerCase();

  if (!normalized) return nodes;

  const result: MenuNode[] = [];

  for (const node of nodes) {
    const children = node.children
      ? filterMenuTree(node.children, keyword)
      : [];
    const selfMatched = [node.label, node.i18nKey ?? "", node.to ?? ""].some(
      (text) => text.toLowerCase().includes(normalized),
    );

    if (selfMatched || children.length > 0) {
      result.push({ ...node, children });
    }
  }

  return result;
}

/** 收集节点自身及其全部后代 id（编辑时父级候选需排除，防止成环） */
export function collectSelfAndDescendantIds(node: MenuNode): Set<string> {
  const ids = new Set<string>();

  const walk = (n: MenuNode) => {
    ids.add(n.id);
    for (const child of n.children ?? []) walk(child);
  };

  walk(node);

  return ids;
}

/** 展平树为父级候选：[depth 缩进前缀] + 名称 */
export function flattenParentOptions(nodes: MenuNode[]): {
  id: string;
  label: string;
}[] {
  const options: { id: string; label: string }[] = [];

  const walk = (list: MenuNode[], depth: number) => {
    for (const node of list) {
      options.push({
        id: node.id,
        label: `${"　".repeat(depth)}${node.label}`,
      });
      if (node.children?.length) walk(node.children, depth + 1);
    }
  };

  walk(nodes, 0);

  return options;
}
