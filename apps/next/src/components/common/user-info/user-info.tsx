"use client";

import { Avatar, Typography, cn } from "@heroui/react";

/**
 * 通用用户信息展示（统一格式）：左侧 Avatar（有 avatar 用图片，否则名称首字
 * fallback）+ 右侧名称（displayName 缺省回退 username）+ 下方邮箱小字。
 *
 * 适用：日志「操作人」列、侧边栏底部用户区等一切需要展示用户摘要的场景。
 * user 传 null 时整体显示占位符 —（无关联用户的表格空值场景）。
 */

/** 用户摘要最小形状（AuthUser / Log 操作人摘要 / User 均满足） */
export interface UserInfoUser {
  username: string;
  displayName?: string | null;
  email?: string | null;
  avatar?: string | null;
}

export interface UserInfoProps {
  /** 用户摘要；null 时显示占位符 — */
  user: UserInfoUser | null;
  /**
   * 次行文案来源：默认 email（缺省回退 username）；
   * 传 "username" 强制展示用户名（如侧边栏，AuthUser 无邮箱）。
   */
  subtitle?: "email" | "username";
  /** 头像尺寸（文字排版固定 body-sm / body-xs） */
  size?: "sm" | "md";
  className?: string;
}

export function UserInfo({
  user,
  subtitle = "email",
  size = "sm",
  className,
}: UserInfoProps) {
  if (!user) {
    return (
      <Typography color="muted" type="body-sm">
        —
      </Typography>
    );
  }

  const name = user.displayName || user.username;
  const secondary =
    subtitle === "username" ? user.username : (user.email ?? user.username);
  const initials = name.slice(0, 1);

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {/* key 随 avatar 变化强制重建 Avatar 子树：Radix Avatar.Root 内部记录的
          图片加载状态在 Avatar.Image 卸载后不会重置（残留 loaded 导致 Fallback
          永不显示），删除头像后必须重建才能回显首字 fallback */}
      <Avatar
        key={user.avatar ?? "fallback"}
        className="shrink-0"
        color="accent"
        size={size}
        variant="soft"
      >
        {user.avatar ? <Avatar.Image alt={name} src={user.avatar} /> : null}
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar>
      {/* 次行与主行内容相同时不重复展示（如未登录兜底仅有 username） */}
      <div className="min-w-0 flex-1 leading-tight">
        <Typography
          className="truncate leading-tight font-medium"
          type="body-sm"
        >
          {name}
        </Typography>
        {secondary !== name && (
          <Typography
            className="truncate leading-tight"
            color="muted"
            type="body-xs"
          >
            {secondary}
          </Typography>
        )}
      </div>
    </div>
  );
}
