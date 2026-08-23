import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Accordion,
  ListBox,
  Popover,
  cn,
  type Selection,
  Button,
} from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";

import { type MenuNode, findActivePath } from "@/data/menus";

type CollapsedMenuProps = {
  items: MenuNode[];
  onNavigate?: () => void;
};

/**
 * 侧边栏折叠态菜单：仅显示一级菜单图标。
 * hover 一级菜单图标时，用 Popover 浮出包含该一级菜单标题与子菜单的面板；
 * 子菜单支持多级（分组用 Accordion 递归，叶子用 ListBox）。
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
              navigate(to);
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

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button isIconOnly variant="ghost">
        <DynamicIcon name={item.icon} size={20} />
      </Button>
      <Popover.Content
        className="p-0"
        offset={8}
        placement="right"
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
      >
        <Popover.Dialog aria-label={item.label} className="w-64 p-2">
          <Popover.Arrow />
          {hasChildren ? (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">
                {item.label}
              </p>
              <CollapsedSubLevel
                items={item.children ?? []}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            </>
          ) : (
            <LeafPopoverItem
              isActive={isActive}
              item={item}
              onNavigate={onNavigate}
            />
          )}
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
        <ListBox
          aria-label="子菜单"
          className="gap-0.5 bg-transparent p-0"
          selectedKeys={selectedKeys}
          selectionMode="single"
          onAction={(key) => onNavigate(String(key))}
        >
          {leaves.map((child) => (
            <ListBox.Item
              key={child.to ?? child.id}
              className="rounded-lg px-3 py-2 text-sm text-muted data-[selected=true]:text-foreground data-[hovered=true]:text-foreground"
              id={child.to ?? child.id}
              textValue={child.label}
            >
              {({ isSelected }) => (
                <span className="flex min-w-0 items-center gap-2">
                  <DynamicIcon
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "text-accent" : "text-muted",
                    )}
                    name={child.icon}
                  />
                  <span className="truncate">{child.label}</span>
                </span>
              )}
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
          <Accordion.Trigger className="rounded-lg px-3 py-2 text-sm">
            <DynamicIcon className="me-2 size-4 shrink-0" name={item.icon} />
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

/** 叶子一级菜单：Popover 内展示该项（点击导航）。 */
function LeafPopoverItem({
  item,
  isActive,
  onNavigate,
}: {
  item: MenuNode;
  isActive: boolean;
  onNavigate: (to?: string | null) => void;
}) {
  return (
    <button
      className={cn(
        "sidebar-nav-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive ? "is-active text-foreground" : "text-muted",
      )}
      type="button"
      onClick={() => onNavigate(item.to)}
    >
      <DynamicIcon
        className={cn(
          "size-4 shrink-0",
          isActive ? "text-accent" : "text-muted",
        )}
        name={item.icon}
      />
      <span className="truncate">{item.label}</span>
    </button>
  );
}
