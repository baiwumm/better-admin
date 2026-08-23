import { type IconName } from "lucide-react/dynamic";

/**
 * 将菜单图标名（后端/Mock 数据中的字符串）收窄为 lucide IconName。
 * Mock 阶段图标字段受控，直接断言；
 * 接入后端后若遇到未知图标名，可在此补充兜底映射（如回退 "circle-help"）。
 */
export function menuIcon(name: string): IconName {
  return name as IconName;
}
