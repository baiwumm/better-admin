/** 代码块演示的示例源码（prismjs 按需注册语法：tsx / css / json / sql / python，与 React 端样本一致）。 */
export const CODE_SAMPLES = {
  tsx: {
    filename: 'use-overlay-state.tsx',
    code: `import { Modal, useOverlayState } from "@heroui/react";

export function ConfirmDialog({ onConfirm }: { onConfirm: () => void }) {
  // 浮层开合状态统一走 useOverlayState（禁止裸 useState 布尔量）
  const state = useOverlayState();

  return (
    <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Modal.Content>
        <Modal.Title>确认操作？</Modal.Title>
        <Modal.Footer>
          <Button variant="secondary" onPress={state.close}>取消</Button>
          <Button onPress={() => { onConfirm(); state.close(); }}>确认</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Backdrop>
  );
}`
  },
  css: {
    filename: 'theme.css',
    code: `/* 项目级 Design Tokens：HeroUI oklch 变量（浅色） */
:root {
  --accent: oklch(62.04% 0.195 253.83);
  --background: oklch(97.02% 0.0015 253.83);
  --foreground: oklch(21.03% 0.0015 253.83);
  --radius: 10px;
}

.dark {
  color-scheme: dark;
  --background: oklch(12% 0.0015 253.83);
  --foreground: oklch(99.11% 0.0015 253.83);
}`
  },
  json: {
    filename: 'openapi.snippet.json',
    code: `{
  "openapi": "3.1.0",
  "info": { "title": "Better Admin API", "version": "1.9.0" },
  "paths": {
    "/users": {
      "get": {
        "summary": "分页查询用户",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer", "minimum": 1 } },
          { "name": "pageSize", "in": "query", "schema": { "type": "integer", "maximum": 100 } }
        ],
        "responses": { "200": { "description": "OK" } }
      }
    }
  }
}`
  },
  sql: {
    filename: 'role-menus.sql',
    code: `-- 角色 ↔ 菜单授权位：登录时 OR 聚合成用户权限
SELECT rm.menu_id,
       BIT_OR(rm.permissions) AS permissions
FROM role_menus rm
JOIN user_roles ur ON ur.role_id = rm.role_id
WHERE ur.user_id = $1
GROUP BY rm.menu_id
ORDER BY rm.menu_id;`
  },
  python: {
    filename: 'build_assets.py',
    code: `from pathlib import Path

SIZES = (16, 32, 96, 180, 192, 512)

def build(source: Path, out_dir: Path) -> list[Path]:
    """按尺寸批量导出品牌图标（真源 assets/logo/）。"""
    outputs = []
    for size in SIZES:
        target = out_dir / f"favicon-{size}x{size}.png"
        render(source, target, size=size)
        outputs.append(target)
    return outputs`
  }
} as const

export type CodeSampleLanguage = keyof typeof CODE_SAMPLES

export const CODE_SAMPLE_LANGUAGES = Object.keys(
  CODE_SAMPLES
) as CodeSampleLanguage[]
