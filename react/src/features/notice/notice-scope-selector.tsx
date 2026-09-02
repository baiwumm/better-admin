import type { DeptTreeNode, NoticeScopeType } from "@/lib/api-types";
import type { Key } from "react";

import { Label, ListBox, Select, Tabs } from "@heroui/react";
import { useMemo, useState } from "react";

import { useTranslation } from "@/i18n";

/**
 * 公告发布范围选择器（契约 v1.7.0 三粒度并集）：
 * Tabs 三页签——组织（平铺缩进多选）/ 岗位（多选）/ 人员（多选），
 * 受控值 NoticeScope[]（三类目标合并数组，切换页签不丢已选）。
 *
 * - 停用组织/岗位禁选；
 * - 人员候选与负责人选择器共用 /users 首页 50 条缓存（量级内可用，
 *   全量分页选择随阶段 4 优化）。
 */

export interface NoticeScopeSelectorProps {
  /** 三类目标分别受控（并集语义，提交时合成 NoticeScope[]） */
  deptIds: string[];
  postIds: string[];
  userIds: string[];
  onDeptIdsChange: (ids: string[]) => void;
  onPostIdsChange: (ids: string[]) => void;
  onUserIdsChange: (ids: string[]) => void;
  tree: DeptTreeNode[];
  posts: { id: string; name: string; deptPath: string; status: string }[];
  users: { id: string; username: string; displayName: string }[];
  usersLoading: boolean;
}

export function NoticeScopeSelector({
  deptIds,
  postIds,
  userIds,
  onDeptIdsChange,
  onPostIdsChange,
  onUserIdsChange,
  tree,
  posts,
  users,
  usersLoading,
}: NoticeScopeSelectorProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<NoticeScopeType>("dept");

  // 组织平铺选项（含停用禁选）
  const deptOptions = useMemo(() => {
    const options: {
      id: string;
      label: string;
      depth: number;
      disabled: boolean;
    }[] = [];

    const walk = (nodes: DeptTreeNode[], depth: number) => {
      for (const node of nodes) {
        options.push({
          id: node.id,
          label: node.name,
          depth,
          disabled: node.status !== "enabled",
        });
        walk(node.children, depth + 1);
      }
    };

    walk(tree, 0);

    return options;
  }, [tree]);

  const selectedSummary = useMemo(() => {
    const parts: string[] = [];

    if (deptIds.length)
      parts.push(t("features.notices.scope.depts", { count: deptIds.length }));
    if (postIds.length)
      parts.push(t("features.notices.scope.posts", { count: postIds.length }));
    if (userIds.length)
      parts.push(t("features.notices.scope.users", { count: userIds.length }));

    return parts.length ? parts.join("、") : t("features.notices.scope.none");
  }, [deptIds.length, postIds.length, userIds.length, t]);

  return (
    <div className="flex flex-col gap-2">
      <Label>{t("features.notices.form.scope")}</Label>
      <Tabs
        aria-label={t("features.notices.form.scope")}
        selectedKey={tab}
        onSelectionChange={(key) => setTab(String(key) as NoticeScopeType)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t("features.notices.form.scope")}>
            <Tabs.Tab id="dept">
              {t("features.notices.scope.tabDept")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="post">
              {t("features.notices.scope.tabPost")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="user">
              {t("features.notices.scope.tabUser")}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="dept">
          <Select
            aria-label={t("features.notices.scope.tabDept")}
            className="w-full"
            placeholder={t("features.notices.scope.deptPlaceholder")}
            selectionMode="multiple"
            value={deptIds}
            variant="secondary"
            onChange={(keys) =>
              onDeptIdsChange(((keys as Key[]) ?? []).map(String))
            }
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox selectionMode="multiple">
                {deptOptions.map((option) => (
                  <ListBox.Item
                    key={option.id}
                    id={option.id}
                    isDisabled={option.disabled}
                    textValue={option.label}
                  >
                    <span
                      className="block truncate"
                      style={{ paddingInlineStart: option.depth * 16 }}
                    >
                      {option.label}
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </Tabs.Panel>

        <Tabs.Panel id="post">
          <Select
            aria-label={t("features.notices.scope.tabPost")}
            className="w-full"
            placeholder={t("features.notices.scope.postPlaceholder")}
            selectionMode="multiple"
            value={postIds}
            variant="secondary"
            onChange={(keys) =>
              onPostIdsChange(((keys as Key[]) ?? []).map(String))
            }
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox selectionMode="multiple">
                {posts.map((post) => (
                  <ListBox.Item
                    key={post.id}
                    id={post.id}
                    isDisabled={post.status !== "enabled"}
                    textValue={post.name}
                  >
                    <span className="flex flex-col">
                      <span>{post.name}</span>
                      <span className="text-xs text-muted">
                        {post.deptPath}
                      </span>
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </Tabs.Panel>

        <Tabs.Panel id="user">
          <Select
            aria-label={t("features.notices.scope.tabUser")}
            className="w-full"
            isDisabled={usersLoading}
            placeholder={
              usersLoading
                ? t("features.notices.scope.usersLoading")
                : t("features.notices.scope.userPlaceholder")
            }
            selectionMode="multiple"
            value={userIds}
            variant="secondary"
            onChange={(keys) =>
              onUserIdsChange(((keys as Key[]) ?? []).map(String))
            }
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox selectionMode="multiple">
                {users.map((user) => (
                  <ListBox.Item
                    key={user.id}
                    id={user.id}
                    textValue={user.displayName || user.username}
                  >
                    {user.displayName || user.username}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </Tabs.Panel>
      </Tabs>
      <p className="text-xs text-muted">{selectedSummary}</p>
    </div>
  );
}
