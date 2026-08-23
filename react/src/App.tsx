import { Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/layouts/admin-layout";
import { PlaceholderPage } from "@/pages/placeholder-page";

/**
 * 应用路由：AdminLayout 提供双栏布局，各业务模块暂用占位页。
 */
function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<PlaceholderPage title="仪表盘" />} />
        <Route
          element={<PlaceholderPage title="三级菜单" />}
          path="multi-level"
        />
        <Route element={<PlaceholderPage title="用户管理" />} path="users" />
        <Route element={<PlaceholderPage title="角色管理" />} path="roles" />
        <Route
          element={<PlaceholderPage title="权限管理" />}
          path="permissions"
        />
        <Route element={<PlaceholderPage title="菜单管理" />} path="menus" />
        <Route element={<PlaceholderPage title="日志管理" />} path="logs" />
        <Route path="settings">
          <Route index element={<PlaceholderPage title="系统设置" />} />
          <Route
            element={<PlaceholderPage title="个人资料" />}
            path="profile"
          />
          <Route element={<PlaceholderPage title="账户" />} path="account" />
          <Route element={<PlaceholderPage title="外观" />} path="appearance" />
          <Route
            element={<PlaceholderPage title="通知" />}
            path="notifications"
          />
          <Route element={<PlaceholderPage title="显示" />} path="display" />
        </Route>
        <Route
          element={
            <PlaceholderPage
              description="你访问的页面不存在（404）。"
              title="页面不存在"
            />
          }
          path="*"
        />
      </Route>
    </Routes>
  );
}

export default App;
