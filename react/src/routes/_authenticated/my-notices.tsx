import { createFileRoute, useSearch } from "@tanstack/react-router";

import { MyNoticesPage } from "@/features/notice/my-notices-page";

interface MyNoticesSearch {
  noticeId?: string;
}

export const Route = createFileRoute("/_authenticated/my-notices")({
  staticData: { titleKey: "menu.pageTitle.myNotices" },
  validateSearch: (search: Record<string, unknown>): MyNoticesSearch => ({
    noticeId:
      typeof search.noticeId === "string" && search.noticeId
        ? search.noticeId
        : undefined,
  }),
  component: function MyNoticesRoute() {
    // 注意：本页不在菜单树（登录白名单页），在 KeepAlive 实例池中为「临时
    // 驻留」成员——切走后的过渡帧里组件仍在渲染，但 match 已切到新路由，
    // Route.useSearch() 的严格匹配会抛 “Could not find an active match”。
    // 故改用 strict:false 的全局 search 读取（直接取当前 location，不依赖
    // match 存在）；validateSearch 仍负责写入时的参数校验。
    const { noticeId } = useSearch({ strict: false }) as MyNoticesSearch;

    return <MyNoticesPage urlNoticeId={noticeId ?? null} />;
  },
});
