import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/permission";

/**
 * 操作级权限门控 hook：当前登录用户是否拥有指定权限位。
 * 经 zustand selector 派生为 boolean，仅在权限结果变化时触发重渲染。
 *
 * @example const canAdd = useHasPermission(PERMISSIONS.ADD);
 */
export function useHasPermission(requiredBits: bigint): boolean {
  return useAuthStore((state) =>
    hasPermission(state.user?.permissions, requiredBits),
  );
}
