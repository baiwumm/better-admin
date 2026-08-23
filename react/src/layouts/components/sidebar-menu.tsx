import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Accordion,
  ListBox,
  type Selection,
  Button,
  Label,
  cn,
} from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";

import { type MenuNode } from "@/data/menus";

type SidebarMenuProps = {
  items: MenuNode[];
  onNavigate?: () => void;
};

/** 根据当前路径返回激活的叶子菜单项（用于 ListBox 高亮）。 */
function findActiveLeaf(
  items: MenuNode[],
  pathname: string,
): MenuNode | undefined {
  for (const item of items) {
    if (item.to && item.to === pathname) return item;
    if (item.children?.length) {
      const found = findActiveLeaf(item.children, pathname);

      if (found) return found;
    }
  }

  return undefined;
}

/** 找出分组菜单（有子级）中当前路径所属的那一项。 */
function findActiveGroup(
  items: MenuNode[],
  pathname: string,
): MenuNode | undefined {
  return items.find(
    (item) =>
      item.children?.length &&
      item.children.some((child) => child.to && child.to === pathname),
  );
}

/**
 * 侧边栏菜单（展开态）：
 * - 一级叶子（无子级，如仪表盘）→ 渲染为普通导航行（图标 + 名称），不包 Accordion
 * - 一级分组（有子级）→ Accordion.Item 折叠展开，Panel 内 ListBox 渲染子菜单
 */
export function SidebarMenu({ items, onNavigate }: SidebarMenuProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const groups = useMemo(
    () => items.filter((i) => i.children?.length),
    [items],
  );
  const leaves = useMemo(
    () => items.filter((i) => !i.children?.length),
    [items],
  );

  const activeGroup = useMemo(
    () => findActiveGroup(items, pathname),
    [items, pathname],
  );
  const activeLeaf = useMemo(
    () => findActiveLeaf(items, pathname),
    [items, pathname],
  );

  // Accordion 受控展开：默认展开包含当前路径的分组 / defaultOpen 项，允许同时展开多个
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () =>
      new Set(
        groups
          .filter(
            (item) =>
              item.defaultOpen || (activeGroup && activeGroup.id === item.id),
          )
          .map((item) => item.id),
      ),
  );

  const handleNavigate = useCallback(
    (to?: string | null) => {
      if (to) {
        navigate(to);
        onNavigate?.();
      }
    },
    [navigate, onNavigate],
  );

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {/* 一级叶子：普通导航行 */}
      {leaves.map((item) => (
        <SidebarLeaf
          key={item.id}
          isActive={item.to === pathname}
          item={item}
          onNavigate={handleNavigate}
        />
      ))}

      {/* 一级分组：Accordion 折叠展开 */}
      {groups.length > 0 && (
        <Accordion
          allowsMultipleExpanded
          hideSeparator
          expandedKeys={expandedKeys}
          onExpandedChange={(keys) =>
            setExpandedKeys(new Set(Array.from(keys, (k) => String(k))))
          }
        >
          {groups.map((item) => (
            <Accordion.Item key={item.id} id={item.id}>
              <Accordion.Heading>
                <Accordion.Trigger
                  className={cn(
                    "rounded-3xl px-3 py-2 hover:bg-default",
                    activeGroup?.id === item.id ? "is-active" : "",
                  )}
                >
                  <DynamicIcon
                    className="me-3 shrink-0"
                    name={item.icon}
                    size={16}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  <Accordion.Indicator>
                    <ChevronDown />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="px-2 pb-2 pt-1">
                  <SidebarSubMenu
                    items={item.children!}
                    selectedTo={activeLeaf?.to}
                    onNavigate={handleNavigate}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
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
  return (
    <Button
      className={cn("w-full", isActive ? "bg-default" : "")}
      variant="ghost"
      onPress={() => onNavigate(item.to)}
    >
      <DynamicIcon className="shrink-0" name={item.icon} />
      <Label className="flex-1 truncate text-left">{item.label}</Label>
    </Button>
  );
}

/** 子菜单：ListBox 渲染，选中高亮当前路由，点击导航。 */
function SidebarSubMenu({
  items,
  selectedTo,
  onNavigate,
}: {
  items: MenuNode[];
  selectedTo?: string | null;
  onNavigate: (to?: string | null) => void;
}) {
  const selectedKeys: Selection = useMemo(
    () => (selectedTo ? new Set([selectedTo]) : new Set()),
    [selectedTo],
  );

  return (
    <ListBox
      aria-label="子菜单"
      className="gap-0.5 bg-transparent p-0"
      selectedKeys={selectedKeys}
      selectionMode="single"
      onAction={(key) => onNavigate(String(key))}
    >
      {items.map((child) => (
        <ListBox.Item
          key={child.to ?? child.id}
          className="rounded-3xl px-3 py-2 text-sm text-muted hover:text-foreground data-[selected=true]:text-foreground data-[selected=true]:bg-default"
          id={child.to ?? child.id}
          textValue={child.label}
        >
          <div className="flex min-w-0 items-center gap-2">
            <DynamicIcon className="shrink-0" name={child.icon} size={16} />
            <span className="truncate">{child.label}</span>
          </div>
        </ListBox.Item>
      ))}
    </ListBox>
  );
}
