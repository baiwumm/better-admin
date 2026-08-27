import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Surface,
  TextField,
  Typography,
} from "@heroui/react";

import { useTranslation } from "@/i18n";

/**
 * Mock 用户数据（静态常量提升到模块级；文案中性化，展示时经 i18n 取词）：
 * 仅用于 keepAlive 保活效果验证，Phase 4 接入真实用户管理后移除。
 */
const MOCK_USERS = Array.from({ length: 40 }, (_, index) => ({
  id: `u-${index + 1}`,
  nameIndex: String(index + 1).padStart(2, "0"),
  email: `user${index + 1}@better-admin.com`,
  role: (index % 5 === 0 ? "admin" : "member") as "admin" | "member",
}));

/**
 * 用户管理页（keepAlive 验证版）。
 *
 * 本页菜单数据 keepAlive = true：切换到其它页面再返回时，
 * 下方三类「组件内部状态」应原样保留——
 * 1. 搜索关键字（受控 Input 值 + 过滤结果）
 * 2. 操作计数（本地 state）
 * 3. 页面滚动位置（离开前记录、返回时恢复）
 */
export function UsersPage() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState("");
  const [actionCount, setActionCount] = useState(0);

  // 关键字过滤（简单 includes；数据量小，无需 memo）
  const normalized = keyword.trim().toLowerCase();
  const filtered = normalized
    ? MOCK_USERS.filter(
        (user) =>
          user.nameIndex.includes(normalized) ||
          user.email.toLowerCase().includes(normalized),
      )
    : MOCK_USERS;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8">
      {/* 标题区 */}
      <div className="flex flex-col gap-1">
        <Typography className="text-xl font-semibold" type="h2">
          {t("menu.pageTitle.users")}
        </Typography>
        <Typography color="muted" type="body-sm">
          {t("common.demo.users.keepAliveDesc")}
        </Typography>
      </div>

      {/* 保活验证工具条 */}
      <Surface className="flex flex-col gap-4 rounded-2xl border border-separator p-5">
        <Typography className="text-sm font-medium" type="h3">
          {t("common.demo.users.verifyTitle")}
        </Typography>
        <div className="flex flex-wrap items-end gap-4">
          {/* aria-label 兜底：<Activity> hidden 会卸载 Label 的 id 注册
              effect，恢复首帧 react-aria 检测不到关联会误发可访问性警告 */}
          <TextField
            aria-label={t("common.demo.users.searchLabel")}
            className="w-64"
            value={keyword}
            onChange={setKeyword}
          >
            <Label>{t("common.demo.users.searchLabel")}</Label>
            <Input
              placeholder={t("common.demo.users.searchPlaceholder")}
              variant="secondary"
            />
          </TextField>
          <Button
            variant="primary"
            onPress={() => setActionCount((count) => count + 1)}
          >
            {t("common.demo.users.countButton", { count: actionCount })}
          </Button>
        </div>
      </Surface>

      {/* 用户列表：足够长以产生页面滚动，用于验证滚动位置恢复 */}
      <Surface className="rounded-2xl border border-separator p-5">
        <div className="mb-3 flex items-center justify-between">
          <Typography className="text-sm font-medium" type="h3">
            {t("common.demo.users.listTitle", { count: filtered.length })}
          </Typography>
          <Typography color="muted" type="body-sm">
            {t("common.demo.users.scrollHint")}
          </Typography>
        </div>
        <ul className="flex flex-col divide-y divide-separator">
          {filtered.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between py-3 text-sm"
            >
              <span className="font-medium">
                {t("common.demo.users.name", { index: user.nameIndex })}
              </span>
              <span className="text-muted">{user.email}</span>
              <span className="text-muted">
                {t(
                  user.role === "admin"
                    ? "common.demo.users.roleAdmin"
                    : "common.demo.users.roleMember",
                )}
              </span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-10 text-center text-sm text-muted">
              {t("common.demo.users.empty", { keyword })}
            </li>
          )}
        </ul>
      </Surface>
    </div>
  );
}
