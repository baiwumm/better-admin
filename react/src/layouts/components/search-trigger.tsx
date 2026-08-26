import { Button, Kbd } from "@heroui/react";
import { Search } from "lucide-react";

/** 平台判定（模块级只算一次）：Mac 显示 ⌘，其余平台显示 Ctrl */
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

type SearchTriggerProps = {
  /** 打开命令面板（AppHeader 传入 useOverlayState 的 open） */
  onPress: () => void;
};

/**
 * 顶栏搜索入口（对标 react-shadcn 的 Search 组件）：
 * - sm+：假输入框样式的按钮（搜索图标 + 占位文案 + 快捷键提示 Kbd），
 *   响应式宽度 sm:w-40 lg:w-52 xl:w-64；
 * - <sm：图标按钮，与顶栏其他图标按钮视觉一致。
 * 点击仅负责打开命令面板（真正的输入在 CommandMenu 内）。
 */
export function SearchTrigger({ onPress }: SearchTriggerProps) {
  return (
    <>
      {/* 移动端：图标按钮 */}
      <Button
        isIconOnly
        aria-label="搜索"
        className="sm:hidden"
        variant="ghost"
        onPress={onPress}
      >
        <Search className="size-5" />
      </Button>

      {/* sm+：假输入框样式按钮 */}
      <Button
        aria-keyshortcuts="Meta+K Control+K"
        aria-label="搜索"
        className="hidden h-8 justify-start gap-2 rounded-md px-2.5 text-sm font-normal text-muted sm:flex sm:w-40 lg:w-52 xl:w-64"
        variant="outline"
        onPress={onPress}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-start">搜索…</span>
        <Kbd className="ms-auto hidden md:flex">
          <Kbd.Abbr keyValue={IS_MAC ? "command" : "ctrl"} />
          <Kbd.Content>K</Kbd.Content>
        </Kbd>
      </Button>
    </>
  );
}
