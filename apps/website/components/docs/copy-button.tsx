"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** 代码块复制按钮（client 交互）；代码文本由 server 侧提取后传入 */
export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用（如非安全上下文）时静默
    }
  };

  return (
    <button
      type="button"
      aria-label={copied ? "已复制" : "复制代码"}
      onClick={copy}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      {copied ? (
        <Check size={14} className="text-emerald-500" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}
