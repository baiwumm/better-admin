"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** 项目实际 Logo（亮/暗双变体，与 react 端 app-sidebar 的切换方式一致） */
export function Logo({
  size = 32,
  className = "rounded-lg",
}: {
  size?: number;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src =
    mounted && resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg";

  return (
    <Image
      src={src}
      alt="Better Admin Logo"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
