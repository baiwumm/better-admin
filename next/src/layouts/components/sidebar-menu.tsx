import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
import {
  Accordion,
  Button,
  Label,
  ListBox,
  cn,
  type Selection,
} from "@heroui/react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

import { type MenuNode } from "@/lib/api-types";
import { getMenuLabel } from "@/lib/menu-i18n";
import { findActivePath } from "@/lib/menu-utils";
import { useTranslation } from "@/i18n";

type SidebarMenuProps = {
  items: MenuNode[];
  onNavigate?: () => void;
};

/**
 * 侧边栏菜单（展开态，支持任意层级）：
 * - 叶子节点（无子级）→ 普通可点击行（图标 + 名称）
 * - 分组节点（有子级）→ Accordion.Item 折叠展开，Panel 内递归下一层；
 *   同一层级的叶子集合用 ListBox 渲染子菜单
 * - 多级展开状态全局共享：路由变化时自动展开激活路径上的所有祖先分组
 *
 * Next 适配：菜单树由 authenticated layout RSC 注入（AppSidebar 传入），
 * 导航改用 next/navigation。
 */
export function SidebarMenu({ items, onNavigate }: SidebarMenuProps) {
  const pathname = usePathname();
  const router = useRouter();

  // 全局受控展开：记录所有层级展开的分组 id
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const init = new Set<string>();

    items
      .filter((item) => item.defaultOpen || isGroupActive(item, pathname))
      .forEach((item) => init.add(item.id));
    findActivePath(items, pathname).forEach((id) => init.add(id));

    return init;
  });

  // 路由变化时自动展开激活路径上的所有祖先。
  // 按 rerender-derived-state-no-effect：派生状态应在渲染期调整，
  // 而非用 useEffect 同步（避免额外渲染周期与状态漂移）。
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    const activeIds = findActivePath(items, pathname);

    if (activeIds.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        let changed = false;

        activeIds.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }
  }

  const handleNavigate = useCallback(
    (to?: string | null) => {
      if (!to) return;
      // 外链（to 以 https:// 开头）新窗口打开；契约 v1.4 起不再有 target 字段
      if (to.startsWith("https://")) {
        window.open(to, "_blank", "noopener");
        onNavigate?.();

        return;
      }
      router.push(to);
      onNavigate?.();
    },
    [router, onNavigate],
  );

  if (items.length === 0) return null;

  return (
    <MenuLevel
      depth={0}
      expandedIds={expandedIds}
      items={items}
      pathname={pathname}
      onExpandedChange={setExpandedIds}
      onNavigate={handleNavigate}
    />
  );
}

/** 判断分组内是否包含当前激活路径（用于父级高亮）。 */
function isGroupActive(item: MenuNode, pathname: string): boolean {
  return findActivePath(item.children ?? [], pathname).length > 0;
}

/** 递归渲染一层菜单：叶子 → 可点击行，分组 → Accordion；子层级叶子集合用 ListBox。 */
function MenuLevel({
  items,
  depth,
  pathname,
  expandedIds,
  onExpandedChange,
  onNavigate,
}: {
  items: MenuNode[];
  depth: number;
  pathname: string;
  expandedIds: Set<string>;
  onExpandedChange: (next: Set<string>) => void;
  onNavigate: (to?: string | null) => void;
}) {
  const { t } = useTranslation();
  const groups = useMemo(
    () => items.filter((i) => i.children?.length),
    [items],
  );
  const leaves = useMemo(
    () => items.filter((i) => !i.children?.length),
    [items],
  );

  // 叶子集合的选中项：当前路径匹配的叶子
  const selectedKeys: Selection = useMemo(
    () => new Set(leaves.filter((l) => l.to === pathname).map((l) => l.to!)),
    [leaves, pathname],
  );

  if (depth === 0) {
    return (
      <div className="flex flex-col gap-1">
        {leaves.map((item) => (
          <SidebarLeaf
            key={item.id}
            isActive={item.to === pathname}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
        {groups.map((item) => (
          <SidebarGroup
            key={item.id}
            depth={depth}
            expandedIds={expandedIds}
            item={item}
            pathname={pathname}
            onExpandedChange={onExpandedChange}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", depth > 1 && "ps-3")}>
      {leaves.length > 0 && (
        // 注意：子菜单“选中态”由路由驱动（selectedKeys 受控），导航必须保证每次点击都触发。
        // React Aria 在默认 toggle 行为下，一旦列表已有选中项，单击只会“改选中”而不会触发
        // onAction，表现为“同组某个子菜单激活后，点击其它子菜单无反应”。
        // 因此改用 selectionBehavior="replace"（保留单击选中 → onSelectionChange 兜底导航，
        // 键盘 Enter 仍走 onAction），disallowEmptySelection 避免点击当前项时出现取消选中抖动。
        <ListBox
          disallowEmptySelection
          aria-label={t("layout.sidebar.submenu")}
          className="gap-0.5 bg-transparent p-0"
          selectedKeys={selectedKeys}
          selectionBehavior="replace"
          selectionMode="single"
          onAction={(key) => onNavigate(String(key))}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0];

            if (key) onNavigate(String(key));
          }}
        >
          {leaves.map((child) => (
            <ListBox.Item
              key={child.to ?? child.id}
              className="rounded-3xl px-3 py-2 text-sm text-muted hover:text-foreground data-[selected=true]:text-foreground data-[selected=true]:bg-default"
              id={child.to ?? child.id}
              textValue={getMenuLabel(child, t)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <DynamicIcon
                  className="shrink-0"
                  name={child.icon as IconName}
                  size={16}
                />
                <span className="flex-1 truncate">
                  {getMenuLabel(child, t)}
                </span>
                {child.to?.startsWith("https://") && (
                  <ArrowUpRight
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted"
                  />
                )}
              </div>
            </ListBox.Item>
          ))}
        </ListBox>
      )}
      {groups.map((item) => (
        <SidebarGroup
          key={item.id}
          depth={depth}
          expandedIds={expandedIds}
          item={item}
          pathname={pathname}
          onExpandedChange={onExpandedChange}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

/** 一级叶子菜单：普通可点击行（图标 + 名称），点击导航。 */
function SidebarLeaf({
  item,
  isActive,
  onNavigate,
}: {
  item: MenuNode;
  isActive: boolean;
  onNavigate: (to?: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <Button
      fullWidth
      className={isActive ? "bg-default" : ""}
      variant="ghost"
      onPress={() => onNavigate(item.to)}
    >
      <DynamicIcon
        className="shrink-0"
        name={item.icon as IconName}
        size={16}
      />
      {/* cursor-inherit：Label 渲染为 <label>，其文本的 computed cursor 会走
          auto 回退（显示文本光标）而非继承 Button 的 pointer，显式声明后
          与图标区域保持一致 */}
      <Label className="flex-1 cursor-pointer truncate text-left">
        {getMenuLabel(item, t)}
      </Label>
      {item.to?.startsWith("https://") && (
        <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-muted" />
      )}
    </Button>
  );
}

/** 分组节点：Accordion.Item 折叠展开，Panel 内递归下一层。 */
function SidebarGroup({
  item,
  depth,
  pathname,
  expandedIds,
  onExpandedChange,
  onNavigate,
}: {
  item: MenuNode;
  depth: number;
  pathname: string;
  expandedIds: Set<string>;
  onExpandedChange: (next: Set<string>) => void;
  onNavigate: (to?: string | null) => void;
}) {
  const isActive = isGroupActive(item, pathname);
  const { t } = useTranslation();

  return (
    <Accordion
      allowsMultipleExpanded
      hideSeparator
      expandedKeys={new Set(expandedIds.has(item.id) ? [item.id] : [])}
      onExpandedChange={(keys) => {
        const next = new Set(expandedIds);
        const expanded = Array.from(keys).some((k) => String(k) === item.id);

        expanded ? next.add(item.id) : next.delete(item.id);
        onExpandedChange(next);
      }}
    >
      <Accordion.Item id={item.id}>
        <Accordion.Heading>
          <Accordion.Trigger
            className={cn(
              "rounded-3xl px-3 py-2 hover:bg-default",
              isActive ? "is-active" : "",
            )}
          >
            <DynamicIcon
              className="me-3 shrink-0"
              name={item.icon as IconName}
              size={16}
            />
            <span className="flex-1 truncate">{getMenuLabel(item, t)}</span>
            <Accordion.Indicator>
              <ChevronDown />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="px-2 pb-2 pt-1">
            <MenuLevel
              depth={depth + 1}
              expandedIds={expandedIds}
              items={item.children ?? []}
              pathname={pathname}
              onExpandedChange={onExpandedChange}
              onNavigate={onNavigate}
            />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
