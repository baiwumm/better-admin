import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ListBox, Popover, type Selection } from "@heroui/react";

import { type MenuNode, getMenuIcon } from "@/data/menus";

type CollapsedMenuProps = {
  items: MenuNode[];
  onNavigate?: () => void;
};

/**
 * 侧边栏折叠态菜单：仅显示一级菜单图标。
 * hover 一级菜单图标时，用 Popover 浮出包含该一级菜单标题与子菜单（ListBox）的面板。
 */
export function CollapsedMenu({ items, onNavigate }: CollapsedMenuProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const closeTimer = useRef<number | undefined>(undefined);

  // 一级图标序列：只有一级项（子菜单在 hover 时通过 Popover 展示）
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
  const Icon = getMenuIcon(item.icon);
  const hasChildren = Boolean(item.children?.length);
  const isActive =
    item.children?.some((c) => c.to === pathname) || item.to === pathname;

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
      <Popover.Trigger>
        <button
          aria-label={item.label}
          className={`sidebar-nav-item flex size-10 items-center justify-center rounded-lg transition-colors ${
            isActive ? "is-active text-foreground" : "text-muted"
          }`}
          title={item.label}
          type="button"
          onMouseEnter={open}
          onMouseLeave={scheduleClose}
        >
          <Icon className="size-5" />
        </button>
      </Popover.Trigger>
      <Popover.Content
        className="p-0"
        offset={8}
        placement="right"
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
      >
        <Popover.Dialog aria-label={item.label} className="w-56 p-2">
          {hasChildren ? (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">
                {item.label}
              </p>
              <CollapsedSubMenu
                items={item.children!}
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

/** Popover 内的子菜单（ListBox 渲染，点击导航）。 */
function CollapsedSubMenu({
  items,
  pathname,
  onNavigate,
}: {
  items: MenuNode[];
  pathname: string;
  onNavigate: (to?: string | null) => void;
}) {
  const selectedKeys: Selection = useMemo(
    () =>
      items.some((c) => c.to === pathname) ? new Set([pathname]) : new Set(),
    [items, pathname],
  );

  return (
    <ListBox
      aria-label="子菜单"
      className="gap-0.5 bg-transparent p-0"
      selectedKeys={selectedKeys}
      selectionMode="single"
      onAction={(key) => onNavigate(String(key))}
    >
      {items.map((child) => {
        const ChildIcon = getMenuIcon(child.icon);

        return (
          <ListBox.Item
            key={child.to ?? child.id}
            className="sidebar-nav-item rounded-lg px-3 py-2 text-sm text-muted data-[selected=true]:text-foreground"
            id={child.to ?? child.id}
            textValue={child.label}
          >
            {({ isSelected }) => (
              <span className="flex min-w-0 items-center gap-2">
                <ChildIcon
                  className={`size-4 shrink-0 ${isSelected ? "text-accent" : "text-muted"}`}
                />
                <span className="truncate">{child.label}</span>
              </span>
            )}
          </ListBox.Item>
        );
      })}
    </ListBox>
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
  const Icon = getMenuIcon(item.icon);

  return (
    <button
      className={`sidebar-nav-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive ? "is-active text-foreground" : "text-muted"
      }`}
      type="button"
      onClick={() => onNavigate(item.to)}
    >
      <Icon
        className={`size-4 shrink-0 ${isActive ? "text-accent" : "text-muted"}`}
      />
      <span className="truncate">{item.label}</span>
    </button>
  );
}
