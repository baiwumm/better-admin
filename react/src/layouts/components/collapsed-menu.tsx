import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  Accordion,
  Button,
  ListBox,
  Popover,
  Tooltip,
  cn,
  type Selection,
} from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

import { type MenuNode } from "@/lib/api-types";
import { findActivePath } from "@/lib/menu-utils";

type CollapsedMenuProps = {
  items: MenuNode[];
  onNavigate?: () => void;
};

/**
 * 侧边栏折叠态菜单：仅显示一级菜单图标。
 * - 叶子一级菜单：hover 用 Tooltip 显示名称，点击图标直接跳转
 * - 多级（分组）菜单：hover 用 Popover 浮出子菜单面板（支持多级嵌套）
 */
export function CollapsedMenu({ items, onNavigate }: CollapsedMenuProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const closeTimer = useRef<number | undefined>(undefined);

  return (
    <div className="flex flex-col items-center gap-1">
      {items.map((item) => (
        <CollapsedMenuItem
          key={item.id}
          closeTimer={closeTimer}
          item={item}
          pathname={pathname}
          onNavigate={(to) => {
            if (to) {
              navigate({ href: to });
              onNavigate?.();
            }
          }}
        />
      ))}
    </div>
  );
}

function CollapsedMenuItem({
  item,
  pathname,
  closeTimer,
  onNavigate,
}: {
  item: MenuNode;
  pathname: string;
  closeTimer: React.MutableRefObject<number | undefined>;
  onNavigate: (to?: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = Boolean(item.children?.length);
  const isActive = findActivePath([item], pathname).length > 0;

  const open = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setIsOpen(true);
  }, [closeTimer]);

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setIsOpen(false), 120);
  }, [closeTimer]);

  // 叶子一级菜单：Tooltip 显示名称，点击直接跳转
  if (!hasChildren) {
    return (
      <Tooltip delay={0}>
        <Button
          isIconOnly
          aria-label={item.label}
          className={cn(isActive && "bg-default")}
          variant="ghost"
          onPress={() => onNavigate(item.to)}
        >
          <DynamicIcon name={item.icon as IconName} />
        </Button>
        <Tooltip.Content placement="right">
          <Tooltip.Arrow />
          {item.label}
        </Tooltip.Content>
      </Tooltip>
    );
  }

  // 多级（分组）菜单：保留 Popover 浮出子菜单
  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button isIconOnly variant="ghost">
        <DynamicIcon name={item.icon as IconName} />
      </Button>
      <Popover.Content
        className="p-0"
        offset={8}
        placement="right"
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
      >
        <Popover.Dialog aria-label={item.label} className="w-64">
          <Popover.Arrow />
          <Popover.Heading className="text-muted text-xs mb-2">
            {item.label}
          </Popover.Heading>
          <CollapsedSubLevel
            items={item.children ?? []}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

/** Popover 内递归子菜单：叶子用 ListBox 渲染，分组用 Accordion 递归。 */
function CollapsedSubLevel({
  items,
  pathname,
  onNavigate,
}: {
  items: MenuNode[];
  pathname: string;
  onNavigate: (to?: string | null) => void;
}) {
  const groups = useMemo(
    () => items.filter((i) => i.children?.length),
    [items],
  );
  const leaves = useMemo(
    () => items.filter((i) => !i.children?.length),
    [items],
  );

  const selectedKeys: Selection = useMemo(
    () => new Set(leaves.filter((l) => l.to === pathname).map((l) => l.to!)),
    [leaves, pathname],
  );

  return (
    <div className="flex flex-col gap-1">
      {leaves.length > 0 && (
        // 与 sidebar-menu.tsx 同一修复：选中态由路由驱动，导航必须每次点击都触发。
        // RAC 默认 toggle 行为下，已有选中项时单击只改选中、不触发 onAction（表现为
        // “同组某个子菜单激活后其它子菜单点击无反应”），故用 replace + onSelectionChange 兜底。
        <ListBox
          disallowEmptySelection
          aria-label="子菜单"
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
              className="px-3 py-2 text-sm text-muted data-[selected=true]:text-foreground data-[hovered=true]:text-foreground"
              id={child.to ?? child.id}
              textValue={child.label}
            >
              <div className="flex min-w-0 items-center gap-2">
                <DynamicIcon
                  className="shrink-0"
                  name={child.icon as IconName}
                  size={16}
                />
                <span className="truncate">{child.label}</span>
              </div>
            </ListBox.Item>
          ))}
        </ListBox>
      )}
      {groups.map((group) => (
        <CollapsedGroup
          key={group.id}
          item={group}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

/** Popover 内的分组节点：Accordion 折叠展开，Panel 内递归。 */
function CollapsedGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: MenuNode;
  pathname: string;
  onNavigate: (to?: string | null) => void;
}) {
  const isActive = findActivePath(item.children ?? [], pathname).length > 0;

  return (
    <Accordion allowsMultipleExpanded hideSeparator className="w-full">
      <Accordion.Item defaultExpanded={isActive} id={item.id}>
        <Accordion.Heading>
          <Accordion.Trigger className="rounded-3xl px-3 py-2 text-sm">
            <DynamicIcon
              className="me-2 size-4 shrink-0"
              name={item.icon as IconName}
            />
            <span className="flex-1 truncate">{item.label}</span>
            <Accordion.Indicator>
              <ChevronDown />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="px-2 pb-1 pt-0.5">
            <CollapsedSubLevel
              items={item.children ?? []}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
