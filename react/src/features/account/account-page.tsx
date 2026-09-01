import type { AccountProfile } from "@/lib/api-types";
import type { ReactNode } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Skeleton,
  Tabs,
  cn,
  useOverlayState,
  Surface,
} from "@heroui/react";
import { ShieldCheck, User } from "lucide-react";
import { useState } from "react";

import {
  ACCOUNT_PROFILE_QUERY_KEY,
  fetchAccountProfile,
  type OnAccountProfileSaved,
} from "./account-api";
import { AvatarCropDialog } from "./avatar-crop-dialog";
import { AccountInfoCard } from "./cards/account-info-card";
import { AvatarCard } from "./cards/avatar-card";
import { EmailFormCard } from "./cards/email-form-card";
import { PasswordFormCard } from "./cards/password-form-card";
import { ProfileFormCard } from "./cards/profile-form-card";
import { ProfileLinksCard } from "./cards/profile-links-card";

import { ErrorContent } from "@/components/common/error-content/error-content";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 我的账户页（非菜单路由，max-w 居中布局，Tabs 分区）：
 * - Account：头像（裁剪上传 / 删除）→ 基本信息（displayName / phone / tags）→ 账号信息（只读）；
 * - Security：修改邮箱 → 修改密码。
 *
 * 改邮箱 / 改密码需当前密码确认（后端 bcrypt 校验）；改密码成功后端
 * tokenVersion+1、清空托管 refreshToken：本会话即刻失效，前端清空本地会话
 * 并跳转登录页。头像 / 资料保存成功后同步 auth-store 快照（侧边栏即时刷新）。
 */

export function AccountPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const cropDialog = useOverlayState();
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ACCOUNT_PROFILE_QUERY_KEY,
    queryFn: fetchAccountProfile,
  });

  /** 保存成功后统一同步：auth-store 快照（侧边栏）+ 详情缓存 */
  const applyProfileUpdate: OnAccountProfileSaved = (updated) => {
    queryClient.setQueryData<AccountProfile>(
      ACCOUNT_PROFILE_QUERY_KEY,
      updated,
    );
    if (authUser) {
      setUser({
        ...authUser,
        displayName: updated.displayName,
        email: updated.email,
        avatar: updated.avatar,
        phone: updated.phone,
        tags: updated.tags,
      });
    }
  };

  /** 选中图片 → 生成 objectURL 打开裁剪弹窗（关闭时统一 revoke） */
  const handlePickImage = (file: File) => {
    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);

      return URL.createObjectURL(file);
    });
    cropDialog.open();
  };

  const closeCropDialog = (isOpen: boolean) => {
    cropDialog.setOpen(isOpen);
    if (!isOpen) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
    }
  };

  if (isLoading) {
    return <AccountPageSkeleton />;
  }

  if (isError || !profile) {
    return (
      <ErrorContent
        action={
          <Button size="sm" variant="secondary" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        }
        description={error instanceof Error ? error.message : undefined}
        title={t("features.account.loadError")}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-6">
      <Tabs aria-label={t("features.account.tabs.label")}>
        <Tabs.ListContainer>
          <Tabs.List aria-label={t("features.account.tabs.label")}>
            <Tabs.Tab className="gap-1.5" id="account">
              <User className="size-4" />
              {t("features.account.tabs.account")}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="gap-1.5" id="security">
              <Tabs.Separator />
              <ShieldCheck className="size-4" />
              {t("features.account.tabs.security")}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="flex flex-col gap-6 pt-4" id="account">
          <AvatarCard
            profile={profile}
            onPickImage={handlePickImage}
            onSaved={applyProfileUpdate}
          />
          <ProfileFormCard
            key={`profile:${profile.updatedAt}`}
            profile={profile}
            onSaved={applyProfileUpdate}
          />
          <ProfileLinksCard
            key={`links:${profile.updatedAt}`}
            profile={profile}
            onSaved={applyProfileUpdate}
          />
          <AccountInfoCard profile={profile} />
        </Tabs.Panel>

        <Tabs.Panel className="flex flex-col gap-6 pt-4" id="security">
          <EmailFormCard
            key={`email:${profile.updatedAt}`}
            profile={profile}
            onSaved={applyProfileUpdate}
          />
          <PasswordFormCard />
        </Tabs.Panel>
      </Tabs>

      {/* 头像选择与裁剪弹窗（objectURL 生命周期由本页管理） */}
      <AvatarCropDialog
        imageSrc={imageSrc}
        isOpen={cropDialog.isOpen}
        onOpenChange={closeCropDialog}
        onUploaded={(avatar) => {
          applyProfileUpdate({ ...profile, avatar });
        }}
      />
    </div>
  );
}

/** 页面加载骨架屏：模拟「Tabs 条 + 头像卡 + 表单卡」的实际布局形状 */
function AccountPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-6">
      {/* Tabs 条 */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-9 rounded-full" />
        <Skeleton className="h-9 rounded-full" />
      </div>

      {/* 头像卡：标题条 + 圆形头像 + 按钮条 + 底部描述条 */}
      <CardSkeleton
        footerDescription
        content={
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        }
        titleClassName="w-16"
      />

      {/* 基本信息表单卡：标题条 + 四行「label + 输入框」+ 底部按钮条 */}
      <CardSkeleton
        content={
          <div className="flex flex-col gap-5">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        }
        footerDescription={false}
        titleClassName="w-20"
      />
    </div>
  );
}

/** 单卡骨架：标题条 + 内容区 +（可选）底部操作/描述条，与真实卡片结构对应 */
function CardSkeleton(props: {
  titleClassName: string;
  content: ReactNode;
  /** 底部条形态：true 为描述小字（头像卡），false 为右对齐按钮（表单卡） */
  footerDescription: boolean;
}) {
  return (
    <Surface className="flex min-w-[320px] flex-col gap-3 rounded-3xl p-6">
      <Skeleton className={cn("mb-4 h-5", props.titleClassName)} />
      {props.content}
      <div className="mt-4 border-t border-separator pt-4">
        {props.footerDescription ? (
          <Skeleton className="h-3 w-64" />
        ) : (
          <div className="flex justify-end">
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        )}
      </div>
    </Surface>
  );
}
