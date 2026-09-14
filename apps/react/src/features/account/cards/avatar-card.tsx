import type { AccountProfile } from "@/lib/api-types";

import { useMutation } from "@tanstack/react-query";
import { Avatar, Button, Card, Spinner, toast } from "@heroui/react";
import { Camera, Trash2 } from "lucide-react";
import { useRef } from "react";

import {
  deleteAccountAvatar,
  getAccountErrorMessage,
  type OnAccountProfileSaved,
} from "../account-api";

import { useTranslation } from "@/i18n";

export interface AvatarCardProps {
  profile: AccountProfile;
  /** 上传/删除成功回调（页面统一同步缓存与 auth-store 快照） */
  onSaved: OnAccountProfileSaved;
  /** 选中图片回调（objectURL 的创建/释放与裁剪弹窗由页面统一管理） */
  onPickImage: (file: File) => void;
}

/** 头像卡：当前头像 + 更换（选择图片 → 裁剪上传）/ 删除 */
export function AvatarCard({ profile, onSaved, onPickImage }: AvatarCardProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteAccountAvatar,
    onSuccess: (updated) => {
      toast.success(t("features.account.avatar.deleteSuccess"));
      onSaved(updated);
    },
    onError: (error) => {
      toast.danger(getAccountErrorMessage(error));
    },
  });

  const isDeleting = deleteMutation.isPending;

  return (
    <Card>
      <Card.Header>
        <Card.Title className="font-bold">
          {t("features.account.avatar.cardTitle")}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="flex items-center gap-4">
          {/* key 随 avatar 变化强制重建子树：删除后 Avatar.Image 卸载，
              保证 Fallback（首字）立即回显，不残留已删除的图片 */}
          <Avatar
            key={profile.avatar ?? "fallback"}
            className="shrink-0"
            color="accent"
            size="lg"
            variant="soft"
          >
            {profile.avatar ? (
              <Avatar.Image alt={profile.displayName} src={profile.avatar} />
            ) : null}
            <Avatar.Fallback>{profile.displayName.slice(0, 1)}</Avatar.Fallback>
          </Avatar>
          <div className="flex items-center gap-2">
            {/* 删除进行中禁用更换，避免并发读改头像 */}
            <Button
              isDisabled={isDeleting}
              size="sm"
              variant="outline"
              onPress={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4" />
              {t("features.account.avatar.change")}
            </Button>
            {profile.avatar ? (
              <Button
                isDisabled={isDeleting}
                size="sm"
                variant="danger-soft"
                onPress={() => deleteMutation.mutate()}
              >
                {isDeleting ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {t("features.account.avatar.delete")}
              </Button>
            ) : null}
          </div>
        </div>
      </Card.Content>
      <Card.Footer>
        <Card.Description className="text-xs">
          {t("features.account.avatar.cardDescription")}
        </Card.Description>
      </Card.Footer>
      {/* 隐藏文件选择入口：本卡触发 change，objectURL 与裁剪弹窗由页面管理 */}
      <input
        ref={fileInputRef}
        aria-hidden
        accept="image/webp,image/png,image/jpeg"
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];

          // 允许重复选择同一文件：先清空 value
          event.target.value = "";
          if (file) onPickImage(file);
        }}
      />
    </Card>
  );
}
