import { GeneralErrorPage } from "@/components/common/error-pages/general-error";
import { generateRouteMetadata } from "@/lib/server/route-metadata";

/** 页面标题：服务端按语言渲染进初始 HTML（key 与 React 端 staticData 同源）。 */
export const generateMetadata = () =>
  generateRouteMetadata("errors.serverError.title");

/** 500 通用错误页（支持 ?from=<原URL> 重试语义，见 general-error.tsx）。 */
export default function ServerErrorPage() {
  return <GeneralErrorPage />;
}
