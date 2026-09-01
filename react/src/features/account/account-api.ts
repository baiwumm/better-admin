import type {
  AccountProfile,
  UpdateAccountEmailInput,
  UpdateAccountPasswordInput,
  UpdateAccountProfileInput,
} from "@/lib/api-types";

import { ApiClientError, fetchApi } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 我的账户 API 层（契约 v1.5.0，/account/* 自助接口）：
 * 详情 + 基本资料（displayName / phone / tags）+ 邮箱 + 密码 + 头像上传。
 *
 * - 改邮箱 / 改密码均需 currentPassword 确认（后端 bcrypt 校验）；
 * - 改密码成功后 tokenVersion+1、清空托管 refreshToken：当前会话即刻失效，
 *   调用方须清空本地会话并引导重新登录（见 account-page）；
 * - 头像经前端裁剪为 256×256 WebP 后以 FormData 上传（fetchApi 原样透传），
 *   服务端中转写入 Supabase Storage 并返回带缓存穿透时间戳的公开 URL。
 */

/** 我的账户详情查询 key（页面与个人头像同步共用） */
export const ACCOUNT_PROFILE_QUERY_KEY = ["account", "profile"] as const;

/** 卡片保存/更新成功回调（参数为服务端返回的最新账户详情，调用方统一同步缓存与快照） */
export type OnAccountProfileSaved = (updated: AccountProfile) => void;

/** GET /account/profile */
export function fetchAccountProfile() {
  return fetchApi<AccountProfile>("/account/profile");
}

/** PUT /account/profile — 修改基本信息 */
export function updateAccountProfile(input: UpdateAccountProfileInput) {
  return fetchApi<AccountProfile>("/account/profile", {
    method: "PUT",
    body: input,
  });
}

/** PUT /account/email — 修改邮箱（当前密码错误 400 / 邮箱冲突 409） */
export function updateAccountEmail(input: UpdateAccountEmailInput) {
  return fetchApi<AccountProfile>("/account/email", {
    method: "PUT",
    body: input,
  });
}

/** PUT /account/password — 修改密码（成功后当前会话立即失效） */
export function updateAccountPassword(input: UpdateAccountPasswordInput) {
  return fetchApi<null>("/account/password", { method: "PUT", body: input });
}

/** POST /account/avatar — 上传裁剪后的头像（multipart），返回新头像 URL */
export function uploadAccountAvatar(blob: Blob) {
  const form = new FormData();

  form.append("file", blob, "avatar.webp");

  return fetchApi<{ avatar: string }>("/account/avatar", {
    method: "POST",
    body: form,
  });
}

/** DELETE /account/avatar — 删除头像（置空并尽力清理 Storage 对象，契约 v1.5.1） */
export function deleteAccountAvatar() {
  return fetchApi<AccountProfile>("/account/avatar", { method: "DELETE" });
}

/** 我的账户模块错误文案映射（未知 code 回退后端 message） */
export function getAccountErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "CURRENT_PASSWORD_INCORRECT":
      return getErrorMessage(
        "errors.account.currentPasswordIncorrect",
        "当前密码不正确",
      );
    case "EMAIL_EXISTS":
      return getErrorMessage("errors.account.emailExists", "邮箱已被占用");
    case "AVATAR_FILE_INVALID":
      return getErrorMessage(
        "errors.account.avatarInvalid",
        "头像文件类型不支持，仅支持 webp / png / jpeg",
      );
    case "AVATAR_FILE_TOO_LARGE":
      return getErrorMessage(
        "errors.account.avatarTooLarge",
        "头像文件不能超过 2MB",
      );
    case "AVATAR_UPLOAD_FAILED":
      return getErrorMessage(
        "errors.account.avatarUploadFailed",
        "头像上传失败，请稍后重试",
      );
    case "VALIDATION_ERROR":
      return getErrorMessage(
        "errors.account.validation",
        "请求参数不合法，请检查表单后重试",
      );
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
