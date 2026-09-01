import { Button } from "@heroui/react";
import { Maximize, Minimize } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/i18n";

/**
 * 全屏切换按钮：点击进入 / 退出浏览器全屏。
 * 显示状态以 document.fullscreenElement 为准并监听 fullscreenchange 同步，
 * 因此 F11、Esc 等外部途径触发的全屏变化也能正确反映到图标上。
 *
 * Next 适配：初始值固定 false（SSR 无 document），挂载后由 sync 立即校正，
 * 避免 useState 初始化器在服务端渲染期访问 document 而崩溃。
 */
export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(document.fullscreenElement != null);
    };

    sync();

    document.addEventListener("fullscreenchange", sync);

    return () => {
      document.removeEventListener("fullscreenchange", sync);
    };
  }, []);

  const { t } = useTranslation();

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <Button
      isIconOnly
      aria-label={
        isFullscreen
          ? t("layout.fullscreen.exit")
          : t("layout.fullscreen.enter")
      }
      size="sm"
      variant="ghost"
      onPress={toggleFullscreen}
    >
      {isFullscreen ? <Minimize /> : <Maximize />}
    </Button>
  );
}
