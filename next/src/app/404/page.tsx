import { NotFoundErrorPage } from "@/components/common/error-pages/not-found-error";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("errors.notFound.title");

/** 404 页面不存在。 */
export default function NotFoundPage() {
  return <NotFoundErrorPage />;
}
