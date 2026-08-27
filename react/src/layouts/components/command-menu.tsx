import type { Key } from "react";

import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Header,
  ListBox,
  Modal,
  SearchField,
  type UseOverlayStateReturn,
} from "@heroui/react";
import { ChevronRight, Laptop, Moon, Sun } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

import { type MenuNode } from "@/lib/api-types";
import { getMenuLabel, type Translate } from "@/lib/menu-i18n";
import { useTranslation } from "@/i18n";
import { filterHiddenMenus } from "@/lib/permission";
import { useMenus } from "@/hooks/use-menus";
import { useThemeModeTransition } from "@/themes/use-theme-mode-transition";

type CommandMenuProps = {
  /** 面板开合状态（由 AppHeader 持有，与搜索入口按钮共享） */
  state: UseOverlayStateReturn;
};

/** 菜单命令条目（叶子节点拍平后的可执行项） */
interface MenuEntry {
  id: string;
  icon: string;
  label: string;
  /** 除顶层分组外的祖先标签链（用于「父级 > 子级」展示与搜索） */
  trail: string[];
  to: string;
  /** 过滤文本：祖先链 + 自身名（小写） */
  searchText: string;
}

/** 命令分组：对应侧边栏的一个顶层分组 */
interface MenuSection {
  id: string;
  title?: string;
  entries: MenuEntry[];
}

/** 主题切换条目：labelKey 经 t() 取词；keywords 供英文关键字搜索（light / dark / system） */
const THEME_ENTRIES = [
  {
    id: "theme-light",
    icon: Sun,
    labelKey: "layout.prefs.themeMode.light",
    keywords: "light",
    mode: "light",
  },
  {
    id: "theme-dark",
    icon: Moon,
    labelKey: "layout.prefs.themeMode.dark",
    keywords: "dark",
    mode: "dark",
  },
  {
    id: "theme-system",
    icon: Laptop,
    labelKey: "layout.prefs.themeMode.system",
    keywords: "system auto",
    mode: "system",
  },
] as const;

/**
 * 把菜单树拍平为命令分组：
 * - 顶层分组节点 → 一个 Section（标题为分组名），其下所有叶子递归收集；
 *   叶子的 searchText 含祖先链与分组名，搜「用户管理」或「系统管理」都能命中。
 * - 顶层叶子节点 → 无标题 Section 的单条目（如「控制台」）。
 * 数据源已由 filterHiddenMenus 做过权限过滤，与侧边栏完全一致。
 */
function collectMenuSections(tree: MenuNode[], t: Translate): MenuSection[] {
  const sections: MenuSection[] = [];

  const walk = (
    nodes: MenuNode[],
    trail: string[],
    rootTitle: string,
    out: MenuEntry[],
  ) => {
    for (const node of nodes) {
      const label = getMenuLabel(node, t);

      if (node.children?.length) {
        walk(node.children, [...trail, label], rootTitle, out);
        continue;
      }
      if (!node.to) continue;
      out.push({
        id: node.id,
        icon: node.icon,
        label,
        trail,
        to: node.to,
        searchText: `${[...trail, label].join(" ")} ${rootTitle}`
          .toLowerCase()
          .trim(),
      });
    }
  };

  for (const node of tree) {
    if (node.children?.length) {
      const entries: MenuEntry[] = [];

      walk(node.children, [], getMenuLabel(node, t), entries);
      if (entries.length > 0) {
        sections.push({ id: node.id, title: getMenuLabel(node, t), entries });
      }
    } else if (node.to) {
      sections.push({
        id: node.id,
        entries: [
          {
            id: node.id,
            icon: node.icon,
            label: getMenuLabel(node, t),
            trail: [],
            to: node.to,
            searchText: getMenuLabel(node, t).toLowerCase(),
          },
        ],
      });
    }
  }

  return sections;
}

/**
 * 全局命令面板（对标 react-shadcn 的 CommandMenu）：
 * - Modal + SearchField + ListBox 组合实现 cmdk 同等交互；
 * - 内容：当前用户可见菜单（按顶层分组分节）+ 「主题」组；
 * - 关闭方式：Esc（直接关闭，不清空）/ 点击遮罩 / ⌘K（与 shadcn
 *   CommandDialog 形态一致，不设可见关闭按钮）；
 * - 键盘：⌘K/Ctrl+K 开关（AppHeader 监听）、输入过滤、↓↑ 选择、
 *   Enter 执行；方向键从输入框可直接进入列表。
 *
 * 搜索词 state 放在 Backdrop 内部的 Body 组件里：面板关闭即卸载，
 * 重新打开时自动复位为空，无需 effect 重置。
 */
export function CommandMenu({ state }: CommandMenuProps) {
  const { t } = useTranslation();

  return (
    <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Modal.Container placement="top" size="lg">
        <Modal.Dialog
          aria-label={t("layout.command.palette")}
          className="gap-0 overflow-hidden p-0"
        >
          <CommandMenuBody onClose={state.close} />
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/** 面板主体：顶部过滤输入 + 可滚动结果列表（挂载在 Backdrop 内，随开合卸载） */
function CommandMenuBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: menuTree } = useMenus();
  const { switchThemeMode } = useThemeModeTransition();
  const { t } = useTranslation();

  // 与侧边栏同一份权限过滤后的菜单树派生命令分组（label 经 i18nKey 取词）
  const sections = useMemo(
    () => collectMenuSections(filterHiddenMenus(menuTree ?? []), t),
    [menuTree, t],
  );

  // 菜单条目动作索引：id → 路由（Map 查找 O(1)）
  const entryRoutes = useMemo(
    () => new Map(sections.flatMap((s) => s.entries.map((e) => [e.id, e.to]))),
    [sections],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    if (!normalizedQuery) return sections;

    return sections
      .map((section) => ({
        ...section,
        entries: section.entries.filter((entry) =>
          entry.searchText.includes(normalizedQuery),
        ),
      }))
      .filter((section) => section.entries.length > 0);
  }, [normalizedQuery, sections]);

  const visibleThemes = useMemo(() => {
    if (!normalizedQuery) return THEME_ENTRIES;

    return THEME_ENTRIES.filter((theme) =>
      `${t(theme.labelKey)}${theme.keywords}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, t]);

  const totalCount =
    visibleSections.reduce((sum, s) => sum + s.entries.length, 0) +
    visibleThemes.length;

  // 执行命令：先关面板再执行（对齐 react-shadcn 的 runCommand 时序）
  const handleAction = useCallback(
    (key: Key) => {
      const id = String(key);

      onClose();

      if (id.startsWith("theme-")) {
        const theme = THEME_ENTRIES.find((t) => t.id === id);

        if (theme) switchThemeMode(theme.mode);

        return;
      }

      const to = entryRoutes.get(id);

      if (to) navigate({ href: to });
    },
    [entryRoutes, navigate, onClose, switchThemeMode],
  );

  // 输入框内 ↓/↑ 直达列表首/末项；进入列表后由 ListBox 原生方向键导航接管
  const focusEdgeOption = useCallback((edge: "first" | "last") => {
    const options =
      listRef.current?.querySelectorAll<HTMLElement>('[role="option"]');

    if (!options || options.length === 0) return;
    options[edge === "first" ? 0 : options.length - 1].focus();
  }, []);

  return (
    <>
      <SearchField
        // eslint-disable-next-line jsx-a11y/no-autofocus -- 命令面板打开即聚焦输入框是标准交互（cmdk 同款）；面板随开合卸载，无残留焦点问题
        autoFocus
        aria-label={t("layout.command.search")}
        value={query}
        variant="secondary"
        onChange={setQuery}
      >
        {/* 命令面板输入条不需要字段式聚焦光环：用 ! 后缀压过
            HeroUI search-field__group 聚焦时的 ring-2 ring-focus（组件样式
            在 utilities 层之后，普通同权重覆盖会被源顺序击败） */}
        <SearchField.Group className="h-12 rounded-none border-0 border-b border-separator bg-transparent px-3 shadow-none focus-within:ring-0!">
          <SearchField.SearchIcon />
          <SearchField.Input
            placeholder={t("layout.command.placeholder")}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                focusEdgeOption("first");
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                focusEdgeOption("last");
              } else if (e.key === "Escape" && !e.nativeEvent.isComposing) {
                // Esc 直接关闭面板：拦在 SearchField 之前（否则它会先清空文本、
                // 吞掉冒泡，需要按两次 Esc），关闭即卸载，无需手动清空
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
          />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <div
        ref={listRef}
        className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain p-1"
      >
        {totalCount === 0 ? (
          <div className="flex h-28 items-center justify-center text-sm text-muted">
            {t("layout.command.empty")}
          </div>
        ) : (
          <ListBox
            aria-label={t("layout.command.results")}
            selectionMode="none"
            onAction={handleAction}
          >
            {visibleSections.map((section) => (
              <ListBox.Section
                key={section.id}
                id={`menu-section-${section.id}`}
              >
                {/* 注意：Section 的 id 必须与所有 Item 的 id 全局唯一，
                    否则 react-aria 集合构建死循环（页面卡死）——
                    故统一加 menu-section- 前缀，避免与顶层叶子节点的 Item id 撞车 */}
                {section.title && <Header>{section.title}</Header>}
                {section.entries.map((entry) => (
                  <ListBox.Item
                    key={entry.id}
                    id={entry.id}
                    textValue={[...entry.trail, entry.label].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <DynamicIcon
                        className="size-4 shrink-0 text-muted"
                        name={entry.icon as IconName}
                        size={16}
                      />
                      {/* 多级菜单显示「父级 > 页面」，与 react-shadcn 一致 */}
                      {entry.trail.length > 0 && (
                        <>
                          <span className="truncate text-muted text-sm">
                            {entry.trail[entry.trail.length - 1]}
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="size-3 shrink-0 text-muted"
                          />
                        </>
                      )}
                      <span className="truncate text-sm">{entry.label}</span>
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            ))}

            {visibleThemes.length > 0 && (
              <ListBox.Section id="command-theme-section">
                <Header>{t("layout.command.themeGroup")}</Header>
                {visibleThemes.map((theme) => (
                  <ListBox.Item
                    key={theme.id}
                    id={theme.id}
                    textValue={t(theme.labelKey)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <theme.icon className="size-4 shrink-0 text-muted" />
                      <span className="truncate text-sm">
                        {t(theme.labelKey)}
                      </span>
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            )}
          </ListBox>
        )}
      </div>
    </>
  );
}
