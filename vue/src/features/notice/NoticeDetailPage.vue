<script setup lang="ts">
import type { NoticeDetail } from "@/lib/api-types";

import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";

import { sanitizeNoticeHtml } from "@/features/notice/sanitize";
import { fetchNoticeDetail } from "@/features/notice/notice-api";
import ErrorContent from "@/components/common/ErrorContent.vue";
import { useMenus } from "@/composables/use-menus";
import { collectMenuPaths } from "@/lib/menu-utils";
import { formatDateTime } from "@/lib/format-date";

/**
 * 公告详情页（全员消费端，契约 v1.7.0 GET /notices/:id，对应 React 端
 * notice-detail-page.tsx）：服务端做可见性校验（super_admin / SEARCH 位 /
 * 发布范围内 / 收到过该公告站内信）；范围内用户进详情自动记首次已读。
 * 非菜单路由（从铃铛通知 / 我的公告入口跳转），登录即可达、不走菜单权限。
 *
 * 版式（对齐 SaaS 后台惯例）：Card 主容器承载返回入口 / 类型标签 / 大标题 /
 * 元信息 / 分隔线 / 正文卡片 / 底部已读状态。
 * 差异说明：React 端会把公告标题写入 tabs meta（多标签页），Vue 端
 * 多标签页随 M3 落地，届时补齐 syncMeta。
 */
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { data: menuTree } = useMenus();

// route.params 为全路由联合类型，动态段用宽松索引取值（消费路由仅本页匹配）
const noticeId = computed(() => {
  const value = (route.params as Record<string, string | string[]>).noticeId;

  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
});

// 公告管理菜单可达性：决定返回入口（返回列表 / 回到控制台）。
// 无公告菜单权限的消费用户点「返回列表」会撞列表页门卫 403，须降级。
const canAccessList = computed(() =>
  menuTree.value ? collectMenuPaths(menuTree.value).has("/org/notices") : false,
);

const detailQuery = useQuery({
  queryKey: computed(() => ["notices", "detail", noticeId.value]),
  queryFn: () => fetchNoticeDetail(noticeId.value),
  staleTime: 0,
});

const notice = computed<NoticeDetail | undefined>(() => detailQuery.data.value);

// 正文 DOMPurify 消毒按内容 computed：详情区任意重渲染不重复全文解析
const sanitizedContent = computed(() =>
  sanitizeNoticeHtml(notice.value?.content ?? ""),
);

const publisherText = computed(() =>
  notice.value
    ? t("features.notices.detail.publisher", {
        name: notice.value.publisherName ?? "—",
        time: formatDateTime(notice.value.publishTime, locale.value),
      })
    : "",
);

function goBack() {
  void router.push(canAccessList.value ? "/org/notices" : "/");
}
</script>

<script lang="ts">
export default { name: "NoticeDetailPage" };
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
    <!-- 加载骨架：与最终卡片同形（信息栏 + 大标题 + 元信息 + 正文块） -->
    <UCard v-if="detailQuery.isLoading.value" class="shadow-sm">
      <div aria-hidden class="flex flex-col gap-5 p-6 md:p-8">
        <USkeleton class="h-6 w-28 rounded-full" />
        <USkeleton class="h-9 w-2/3 rounded-xl" />
        <USkeleton class="h-3.5 w-1/3 rounded-md" />
        <USkeleton class="h-64 w-full rounded-2xl" />
      </div>
    </UCard>

    <div v-else-if="detailQuery.isError.value || !notice" class="py-10">
      <ErrorContent
        :description="t('features.notices.detail.notVisible')"
        :retry-label="t('features.notices.detail.backToConsole')"
        :title="t('features.notices.detail.notVisibleTitle')"
        @retry="goBack"
      />
    </div>

    <UCard v-else class="shadow-sm">
      <div class="flex flex-col gap-5 p-6 md:p-8">
        <!-- 返回入口：有公告菜单权限 → 返回列表；否则降级回控制台 -->
        <div>
          <UButton
            :label="
              canAccessList
                ? t('features.notices.detail.backToList')
                : t('features.notices.detail.backToConsole')
            "
            color="neutral"
            icon="i-lucide-arrow-left"
            size="sm"
            variant="ghost"
            @click="goBack"
          />
        </div>

        <!-- 信息栏：类型标签 + 置顶标识 -->
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            :label="t('features.notices.detail.typeNotice')"
            color="primary"
            variant="soft"
          />
          <UBadge
            v-if="notice.isTop"
            :label="t('features.notices.status.top')"
            color="warning"
            variant="soft"
          />
        </div>

        <!-- 标题：大字号加粗，leading-relaxed 保证长标题换行阅读间距 -->
        <h1 class="text-2xl font-bold leading-relaxed">
          {{ notice.title }}
        </h1>

        <!-- 元信息：发布人头像（有头像才显示）+ 发布人 · 发布时间 -->
        <div class="flex items-center gap-2">
          <UAvatar
            v-if="notice.publisherAvatar"
            :alt="notice.publisherName ?? '—'"
            :src="notice.publisherAvatar"
            :text="(notice.publisherName ?? '—').slice(0, 1)"
            class="shrink-0"
            size="sm"
          />
          <span class="text-muted text-xs">
            {{ publisherText }}
          </span>
        </div>

        <USeparator />

        <!-- 正文：限高滚动容器防超长内容撑爆页面；content 缺失回退标题文本 -->
        <div
          class="bg-elevated/50 max-h-[480px] overflow-y-auto rounded-xl p-5"
        >
          <!-- 内容来自 Tiptap 编辑并经 DOMPurify 消毒（sanitizeNoticeHtml） -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="notice.content"
            class="prose-notice text-sm leading-7"
            v-html="sanitizedContent"
          />
          <!-- eslint-enable vue/no-v-html -->
          <p v-else class="text-sm leading-7">
            {{ notice.title }}
          </p>
        </div>

        <!-- 底部状态：已读时间弱化展示 -->
        <span class="text-muted text-xs">
          {{
            notice.myReadAt
              ? t("features.notices.detail.readAtTip", {
                  time: formatDateTime(notice.myReadAt, locale),
                })
              : t("features.notices.detail.readRecorded")
          }}
        </span>
      </div>
    </UCard>
  </div>
</template>
