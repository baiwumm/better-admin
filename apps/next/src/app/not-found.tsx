import { NotFoundErrorPage } from "@/components/common/error-pages/not-found-error";

/** 未匹配路由的 404 兜底（等价 React 版根路由 notFoundComponent）。 */
export default function NotFound() {
  return <NotFoundErrorPage />;
}
