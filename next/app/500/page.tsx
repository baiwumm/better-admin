import { GeneralErrorPage } from "@/components/common/error-pages/general-error";

/** 500 通用错误页（支持 ?from=<原URL> 重试语义，见 general-error.tsx）。 */
export default function ServerErrorPage() {
  return <GeneralErrorPage />;
}
