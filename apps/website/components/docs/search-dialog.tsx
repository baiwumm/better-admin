"use client";

import { ArrowRight, SearchIcon } from "lucide-react";
import { useDocsSearch } from "fumadocs-core/search/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 站内搜索（beUI 风格：居中悬浮面板 + 本地静态索引检索）
 *
 * 索引仍是构建期导出的静态文件（app/api/search → out/api/search），
 * 检索用 fumadocs-core 的 useDocsSearch（static client），与 fumadocs-ui 无关。
 * 键盘：⌘K / Ctrl+K 或 / 唤起；↑↓ 选择、Enter 跳转、Esc 关闭。
 */

interface SearchHit {
  id: string;
  url: string;
  type: "page" | "heading" | "text";
  /** markdown 串，命中词已被 <mark> 包裹 */
  content: string;
  breadcrumbs?: string[];
}

/** 把索引返回的 markdown 摘要渲染为富文本（mark 高亮 / 行内代码 / 粗体） */
function renderRich(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // 依次识别 <mark>..</mark>、`code`、**bold**
  const pattern = /<mark>([\s\S]*?)<\/mark>|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    if (match[1] !== undefined) {
      parts.push(
        <mark
          key={key++}
          className="rounded-sm bg-muted px-0.5 font-semibold text-foreground"
        >
          {match[1]}
        </mark>,
      );
    } else if (match[2] !== undefined) {
      parts.push(
        <code
          key={key++}
          className="rounded-md bg-muted px-1 py-0.5 font-mono text-[12px]"
        >
          {match[2]}
        </code>,
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <span key={key++} className="font-semibold text-foreground">
          {match[3]}
        </span>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { search, setSearch, query } = useDocsSearch({ type: "static" });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(0);

  const hits: SearchHit[] =
    typeof query.data === "string" || query.data === undefined
      ? []
      : query.data;

  // 打开时聚焦输入框 + 锁定背景滚动
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previous;
      clearTimeout(timer);
    };
  }, [open]);

  // 查询变化后重置选中项
  useEffect(() => {
    setCursor(0);
  }, [search]);

  useEffect(() => {
    setCursor((prev) => Math.min(prev, Math.max(0, hits.length - 1)));
  }, [hits.length]);

  if (!open) return null;

  const go = (url: string) => {
    onClose();
    router.push(url);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((prev) => (hits.length === 0 ? 0 : (prev + 1) % hits.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor(
        (prev) =>
          (hits.length === 0 ? 0 : (prev - 1 + hits.length) % hits.length),
      );
    } else if (event.key === "Enter") {
      const hit = hits[cursor];
      if (hit) {
        event.preventDefault();
        go(hit.url);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="搜索文档"
      onKeyDown={onKeyDown}
    >
      {/* 背景遮罩 */}
      <button
        type="button"
        aria-label="关闭搜索"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />

      <div className="navbar-premium relative w-full max-w-xl overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索文档…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          className="docs-scrollbar max-h-[46vh] overflow-y-auto p-2"
        >
          {search.trim().length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              输入关键词检索全部文档
            </p>
          ) : query.isLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              检索中…
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              没有找到「{search}」相关的结果
            </p>
          ) : (
            hits.map((hit, i) => (
              <button
                key={`${hit.id}-${i}`}
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(hit.url)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                  i === cursor ? "bg-muted" : ""
                }`}
              >
                <ArrowRight
                  size={14}
                  className={`shrink-0 ${
                    i === cursor ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  {hit.breadcrumbs && hit.breadcrumbs.length > 0 && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {hit.breadcrumbs.join(" / ")}
                    </span>
                  )}
                  <span className="block truncate text-sm text-foreground">
                    {renderRich(hit.content)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-dashed border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>esc 关闭</span>
        </div>
      </div>
    </div>
  );
}

/** 全局快捷键（⌘K / Ctrl+K / /）唤起搜索；由文档布局挂载 */
export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}
