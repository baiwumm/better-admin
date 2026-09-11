import { ForbiddenErrorPage } from "@/components/common/error-pages/forbidden-error";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("errors.forbidden.title");

/** 403 无权限页。 */
export default function ForbiddenPage() {
  return <ForbiddenErrorPage />;
}
