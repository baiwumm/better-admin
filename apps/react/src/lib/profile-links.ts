/**
 * 个人链接（契约 v1.5.2/1.5.3）展示工具：AuthUser / User 的三个裸值字段
 * 拼接为可访问 URL。前缀规则集中此处，变更只改这一处。
 */

export type ProfileLinkKey = "website" | "github" | "x";

export interface ProfileLinkItem {
  key: ProfileLinkKey;
  /** 拼接后的完整 https URL */
  url: string;
  /** 菜单/悬浮提示的 i18n key（layout.user.link*） */
  labelKey:
    | "layout.user.linkWebsite"
    | "layout.user.linkGitHub"
    | "layout.user.linkX";
}

/** 个人链接最小形状（AuthUser / User 均满足） */
export interface ProfileLinksSource {
  website?: string | null;
  githubUsername?: string | null;
  xUsername?: string | null;
}

/** 按固定顺序（主页 → GitHub → X）拼出已填写的链接列表，全空返回空数组 */
export function buildProfileLinks(user: ProfileLinksSource): ProfileLinkItem[] {
  const items: ProfileLinkItem[] = [];

  if (user.website) {
    items.push({
      key: "website",
      url: `https://${user.website}`,
      labelKey: "layout.user.linkWebsite",
    });
  }
  if (user.githubUsername) {
    items.push({
      key: "github",
      url: `https://github.com/${user.githubUsername}`,
      labelKey: "layout.user.linkGitHub",
    });
  }
  if (user.xUsername) {
    items.push({
      key: "x",
      url: `https://x.com/${user.xUsername}`,
      labelKey: "layout.user.linkX",
    });
  }

  return items;
}

/** 新窗口打开外部链接（noopener 防反向标签劫持） */
export function openExternalLink(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
