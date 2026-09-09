import { createFileRoute, redirect } from "@tanstack/react-router";

import { NotFoundErrorPage } from "@/components/common/error-pages/not-found-error";

/** 未登录访问一律先过登录（携带回跳地址），错误页不再匿名可见。 */
export const Route = createFileRoute("/404")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.getState().accessToken) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
  },
  staticData: { titleKey: "errors.notFound.title" },
  component: NotFoundErrorPage,
});
