import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";

import { ROUTE_PATHS } from "@/lib/route-paths";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

/** 系统设置二级导航（对齐 ui-spec：左侧 sticky 导航 + 内容区）。 */
const settingsNav = [
  { to: ROUTE_PATHS.settings, label: "系统设置" },
  { to: ROUTE_PATHS.settingsProfile, label: "个人资料" },
  { to: ROUTE_PATHS.settingsAccount, label: "账户" },
  { to: ROUTE_PATHS.settingsAppearance, label: "外观" },
  { to: ROUTE_PATHS.settingsNotifications, label: "通知" },
  { to: ROUTE_PATHS.settingsDisplay, label: "显示" },
];

function SettingsLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex gap-6">
      <nav className="flex w-48 shrink-0 flex-col gap-1">
        {settingsNav.map((item) => (
          <Link
            key={item.to}
            className={`rounded-3xl px-3 py-2 text-sm transition-colors ${
              pathname === item.to
                ? "bg-default font-medium text-foreground"
                : "text-muted hover:bg-default hover:text-foreground"
            }`}
            to={item.to}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
