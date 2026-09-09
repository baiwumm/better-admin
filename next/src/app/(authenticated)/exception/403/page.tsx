import { ForbiddenErrorPage } from "@/components/common/error-pages/forbidden-error";

/** 403 异常页演示（菜单页,主体区 embedded 形态,区别于错误跳转的全屏 /403）。 */
export default function Exception403Page() {
  return <ForbiddenErrorPage variant="embedded" />;
}
