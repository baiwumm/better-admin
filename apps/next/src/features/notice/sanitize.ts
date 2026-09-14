"use client";

import DOMPurify from "dompurify";

/**
 * 公告富文本 HTML 消毒（渲染端，契约 v1.7.0）。
 *
 * 公告内容由 Tiptap 编辑（schema 白名单过滤），但公告接口可被直接调用
 * 写入任意 HTML——渲染前必须经 DOMPurify 消毒，阻断存储型 XSS
 * （去除 script/事件属性/javascript: 协议等，仅保留常规富文本标签）。
 */
export function sanitizeNoticeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "iframe"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}
