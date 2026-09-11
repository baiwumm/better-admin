import { generateRouteMetadata } from "@/lib/server/route-metadata";

/**
 * 登录页元数据（页面本体为客户端组件，metadata 由服务端 layout 提供）：
 * 标题 key 与 React 端 sign-in 路由的 staticData 同源。
 */
export const generateMetadata = () =>
  generateRouteMetadata("auth.signIn.title");

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
