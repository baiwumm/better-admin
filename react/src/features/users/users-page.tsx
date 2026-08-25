import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Surface,
  TextField,
  Typography,
} from "@heroui/react";

/**
 * Mock 用户数据（静态常量提升到模块级）：
 * 仅用于 keepAlive 保活效果验证，Phase 4 接入真实用户管理后移除。
 */
const MOCK_USERS = Array.from({ length: 40 }, (_, index) => ({
  id: `u-${index + 1}`,
  name: `用户 ${String(index + 1).padStart(2, "0")}`,
  email: `user${index + 1}@better-admin.com`,
  role: index % 5 === 0 ? "管理员" : "成员",
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
  const [keyword, setKeyword] = useState("");
  const [actionCount, setActionCount] = useState(0);

  // 关键字过滤（简单 includes；数据量小，无需 memo）
  const normalized = keyword.trim().toLowerCase();
  const filtered = normalized
    ? MOCK_USERS.filter(
        (user) =>
          user.name.toLowerCase().includes(normalized) ||
          user.email.toLowerCase().includes(normalized),
      )
    : MOCK_USERS;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8">
      {/* 标题区 */}
      <div className="flex flex-col gap-1">
        <Typography className="text-xl font-semibold" type="h2">
          用户管理
        </Typography>
        <Typography color="muted" type="body-sm">
          本页已开启路由保活（keepAlive）：输入文字、点击按钮、滚动页面后切换到其它菜单再返回，
          状态与滚动位置均会保留。对比访问未开启保活的页面即可感受差异。
        </Typography>
      </div>

      {/* 保活验证工具条 */}
      <Surface className="flex flex-col gap-4 rounded-2xl border border-separator p-5">
        <Typography className="text-sm font-medium" type="h3">
          组件状态保活验证
        </Typography>
        <div className="flex flex-wrap items-end gap-4">
          {/* aria-label 兜底：<Activity> hidden 会卸载 Label 的 id 注册
              effect，恢复首帧 react-aria 检测不到关联会误发可访问性警告 */}
          <TextField
            aria-label="搜索用户"
            className="w-64"
            value={keyword}
            onChange={setKeyword}
          >
            <Label>搜索用户（切走后应保留）</Label>
            <Input placeholder="试试输入：admin" variant="secondary" />
          </TextField>
          <Button
            variant="primary"
            onPress={() => setActionCount((count) => count + 1)}
          >
            点我计数（{actionCount}）
          </Button>
        </div>
      </Surface>

      {/* 用户列表：足够长以产生页面滚动，用于验证滚动位置恢复 */}
      <Surface className="rounded-2xl border border-separator p-5">
        <div className="mb-3 flex items-center justify-between">
          <Typography className="text-sm font-medium" type="h3">
            用户列表（Mock × {filtered.length}）
          </Typography>
          <Typography color="muted" type="body-sm">
            滚动到底部后切走再回来，位置不丢
          </Typography>
        </div>
        <ul className="flex flex-col divide-y divide-separator">
          {filtered.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between py-3 text-sm"
            >
              <span className="font-medium">{user.name}</span>
              <span className="text-muted">{user.email}</span>
              <span className="text-muted">{user.role}</span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-10 text-center text-sm text-muted">
              未找到匹配「{keyword}」的用户
            </li>
          )}
        </ul>
      </Surface>
    </div>
  );
}
