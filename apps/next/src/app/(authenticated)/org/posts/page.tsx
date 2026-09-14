import { PostsPage as OrgPostsView } from "@/features/org/posts-page";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("menu.pageTitle.posts");

/** 岗位管理页（/org/posts）。筛选/分页/成员穿透见 features/org。 */
export default function OrgPostsPage() {
  return <OrgPostsView />;
}
