import { create } from "zustand";

interface DisplayedPathState {
  /**
   * 已提交呈现的路由路径（与 KeepAliveOutlet 的 displayedPath 同源镜像）。
   *
   * 布局区（如 AppHeader 面包屑）消费本值而非裸 useLocation().pathname：
   * 路由切换期间 pathname 已变为新页，而主体内容冻结在旧页、延迟到
   * KeepAliveOutlet 的过渡回调内 flushSync 提交——布局区跟随本值才能与
   * 主体内容在同一提交内一起切换，文案不会先于页面内容跳变。
   */
  path: string;
  setPath: (path: string) => void;
}

export const useDisplayedPathStore = create<DisplayedPathState>()((set) => ({
  path: "",
  setPath: (path) => set({ path }),
}));
