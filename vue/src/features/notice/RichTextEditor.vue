<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";

import { useEditor, EditorContent } from "@tiptap/vue-3";
import { StarterKit } from "@tiptap/starter-kit";
import { onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 富文本编辑器（Tiptap v3 + StarterKit，对应 React 端 rich-text-editor.tsx）。
 *
 * - 受控 value/onChange（HTML 字符串）；StarterKit schema 白名单约束节点，
 *   粘贴的超纲内容会被过滤；渲染端另经 DOMPurify 消毒（见 sanitizeNoticeHtml）；
 * - 工具栏：加粗/斜体/删除线/标题/无序列表/有序列表/引用/撤销/重做。
 */
const props = defineProps<{
  value: string;
  /** 无障碍标签 */
  ariaLabel?: string;
}>();

const emit = defineEmits<{ change: [html: string] }>();

const { t } = useI18n();

const editor = useEditor({
  extensions: [StarterKit],
  content: props.value || "",
  editorProps: {
    attributes: {
      "aria-label": props.ariaLabel ?? "",
      class:
        "prose-notice min-h-40 max-h-72 overflow-y-auto rounded-lg border border-default bg-default px-3 py-2 text-sm outline-none",
    },
  },
  onUpdate: ({ editor: current }) => {
    emit("change", current.isEmpty ? "" : current.getHTML());
  },
});

// 外部 value 变化（编辑回显）时同步进编辑器
watch(
  () => props.value,
  (value) => {
    if (!editor.value) return;

    const current = editor.value.isEmpty ? "" : editor.value.getHTML();

    if (value !== current) {
      editor.value.commands.setContent(value || "", { emitUpdate: false });
    }
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

interface ToolbarItem {
  key: string;
  label: string;
  icon: string;
  active: boolean;
  disabled: boolean;
  run: (e: Editor) => void;
}

function buildToolbar(e: Editor): ToolbarItem[] {
  return [
    {
      key: "bold",
      label: t("features.notices.editor.bold"),
      icon: "i-lucide-bold",
      active: e.isActive("bold"),
      disabled: false,
      run: (ed) => ed.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      label: t("features.notices.editor.italic"),
      icon: "i-lucide-italic",
      active: e.isActive("italic"),
      disabled: false,
      run: (ed) => ed.chain().focus().toggleItalic().run(),
    },
    {
      key: "strike",
      label: t("features.notices.editor.strike"),
      icon: "i-lucide-strikethrough",
      active: e.isActive("strike"),
      disabled: false,
      run: (ed) => ed.chain().focus().toggleStrike().run(),
    },
    {
      key: "heading",
      label: t("features.notices.editor.heading"),
      icon: "i-lucide-heading-2",
      active: e.isActive("heading", { level: 2 }),
      disabled: false,
      run: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "bulletList",
      label: t("features.notices.editor.bulletList"),
      icon: "i-lucide-list",
      active: e.isActive("bulletList"),
      disabled: false,
      run: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      key: "orderedList",
      label: t("features.notices.editor.orderedList"),
      icon: "i-lucide-list-ordered",
      active: e.isActive("orderedList"),
      disabled: false,
      run: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      key: "blockquote",
      label: t("features.notices.editor.quote"),
      icon: "i-lucide-quote",
      active: e.isActive("blockquote"),
      disabled: false,
      run: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      key: "undo",
      label: t("features.notices.editor.undo"),
      icon: "i-lucide-undo-2",
      active: false,
      disabled: !e.can().undo(),
      run: (ed) => ed.chain().focus().undo().run(),
    },
    {
      key: "redo",
      label: t("features.notices.editor.redo"),
      icon: "i-lucide-redo-2",
      active: false,
      disabled: !e.can().redo(),
      run: (ed) => ed.chain().focus().redo().run(),
    },
  ];
}
</script>

<script lang="ts">
export default { name: "RichTextEditor" };
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="editor"
      class="border-default flex flex-wrap items-center gap-1 rounded-lg border p-1"
    >
      <UButton
        v-for="item in buildToolbar(editor)"
        :key="item.key"
        :aria-label="item.label"
        :class="{ 'bg-elevated text-highlighted': item.active }"
        :color="'neutral'"
        :disabled="item.disabled"
        :title="item.label"
        class="size-7"
        size="sm"
        variant="ghost"
        @click="item.run(editor!)"
      >
        <UIcon :name="item.icon" class="size-3.5" />
      </UButton>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>
