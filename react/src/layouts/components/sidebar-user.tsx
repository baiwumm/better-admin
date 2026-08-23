import { Avatar } from "@heroui/react";

type SidebarUserProps = {
  collapsed?: boolean;
};

const mockUser = {
  name: "管理员",
  email: "admin@better-admin.local",
  avatar: "",
};

/** 侧边栏底部用户区：头像 + 名称/邮箱（折叠态仅显示头像）。 */
export function SidebarUser({ collapsed }: SidebarUserProps) {
  const initials = mockUser.name.slice(0, 1);

  return (
    <div
      className={`flex items-center gap-3 border-t border-separator p-3 ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <Avatar className="shrink-0" size="md">
        <Avatar.Image alt={mockUser.name} src={mockUser.avatar} />
        <Avatar.Fallback className="bg-default text-foreground">
          {initials}
        </Avatar.Fallback>
      </Avatar>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {mockUser.name}
          </p>
          <p className="truncate text-xs text-muted">{mockUser.email}</p>
        </div>
      )}
    </div>
  );
}
