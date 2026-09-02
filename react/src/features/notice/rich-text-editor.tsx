import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Button, cn } from "@heroui/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
} from "lucide-react";
import { useEffect } from "react";

import { useTranslation } from "@/i18n";

/**
 * 富文本编辑器（Tiptap v3 + StarterKit，契约 v1.7.0 公告内容）。
 *
 * - 受控 value/onChange（HTML 字符串）；StarterKit schema 白名单约束节点，
 *   粘贴的超纲内容会被过滤；渲染端另经 DOMPurify 消毒（见 sanitizeNoticeHtml）；
 * - 工具栏：加粗/斜体/删除线/标题/无序列表/有序列表/引用/撤销/重做。
 */

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** 无障碍标签 */
  ariaLabel?: string;
  className?: string;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      isIconOnly
      aria-label={label}
      className={cn(
        "size-7 min-w-0",
        active && "bg-default text-default-foreground",
      )}
      isDisabled={disabled}
      size="sm"
      variant="ghost"
      onPress={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  className,
}: RichTextEditorProps) {
  const { t } = useTranslation();

  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel ?? "",
        class:
          "prose-notice min-h-40 max-h-72 overflow-y-auto rounded-2xl border border-border bg-content1 px-3 py-2 text-sm outline-hidden",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.isEmpty ? "" : current.getHTML());
    },
  });

  // 外部 value 变化（编辑回显）时同步进编辑器
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();

    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border p-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          label={t("features.notices.editor.bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          label={t("features.notices.editor.italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          label={t("features.notices.editor.strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          label={t("features.notices.editor.heading")}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          label={t("features.notices.editor.bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          label={t("features.notices.editor.orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          label={t("features.notices.editor.quote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor.can().undo()}
          label={t("features.notices.editor.undo")}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor.can().redo()}
          label={t("features.notices.editor.redo")}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
