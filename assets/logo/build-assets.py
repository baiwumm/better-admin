# -*- coding: utf-8 -*-
"""Better Admin Logo 资源构建脚本（方案 03 Monogram B 精修版）。

本脚本是 `assets/logo/` 下所有交付资源、以及各端 `apps/<app>/public/` 图标资产的
**唯一生成入口**——请勿手工编辑生成物（尤其 favicon.ico 与各派生 PNG），改几何就改
本目录下的 SVG 源，然后重跑本脚本。

职责：
1. 用本机无头 Chrome 把 SVG 栅格化到指定像素尺寸（透明底、1:1 像素、可校验）；
2. 打包 favicon.ico（16/32/48，BMP/DIB 条目，最大兼容）；
3. 生成派生位图（沿用仓库既有文件名与像素尺寸）；
4. 生成 preview.png（亮色场景 / 暗色场景 / ogimg 极限检查 / 像素放大自检）；
5. 执行验收自检：16px、20px 字符栅格、亮暗两版像素级一致性、SVG 色值扫描。

设计过程稿（三方案对照、精修前后）见 `.workbuddy/design/logo-drafts/compare.html`，
其所需位图由同目录的 `build-compare.py` 生成（复用本文件的 render()）。

运行（Windows / 本仓库已验证环境）：
  C:\\Users\\Administrator\\.workbuddy\\binaries\\python\\envs\\default\\Scripts\\python.exe assets/logo/build-assets.py

依赖：Pillow（已装在上述 venv 中）；本机 Chrome 或 Edge。
"""

from __future__ import annotations

import json
import re
import struct
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops

# assets/logo/build-assets.py → parents[2] = 仓库根
REPO = Path(__file__).resolve().parents[2]
UNIFIED = REPO / "assets" / "logo"
APPS = REPO / "apps"
WORK = Path(r"C:\Users\Administrator\.workbuddy\tmp\logo-build")

CHROME_CANDIDATES = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
]

PLATE_DARK = (10, 10, 10)
PLATE_LIGHT = (255, 255, 255)

PAGE_TMPL = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<style>
  html,body{{margin:0;padding:0;background:transparent}}
  img{{display:block;width:{size}px;height:{size}px}}
</style></head><body><img alt="" src="{src}"/></body></html>
"""


def chrome_bin() -> Path:
    for candidate in CHROME_CANDIDATES:
        if candidate.exists():
            return candidate
    raise RuntimeError("未找到可用的 Chrome / Edge 可执行文件")


def render(svg: Path, size: int, tag: str) -> Image.Image:
    """把 SVG 栅格化为 size×size 的 RGBA 图像（透明底）。"""
    WORK.mkdir(parents=True, exist_ok=True)
    page = WORK / f"page-{tag}-{size}.html"
    page.write_text(PAGE_TMPL.format(size=size, src=svg.as_uri()), encoding="utf-8")
    out = WORK / f"shot-{tag}-{size}.png"
    cmd = [
        str(chrome_bin()),
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={WORK / 'profile'}",
        "--force-device-scale-factor=1",
        f"--window-size={size},{size}",
        "--default-background-color=00000000",
        f"--screenshot={out}",
        page.as_uri(),
    ]
    subprocess.run(cmd, capture_output=True, check=False)
    if not out.exists():
        raise RuntimeError(f"截图失败：{out}")
    img = Image.open(out).convert("RGBA")
    if img.size != (size, size):
        img = img.crop((0, 0, size, size))
    return img


def build_ico(frames: list[tuple[int, Image.Image]], out: Path) -> None:
    """手写 ICO 容器：每帧为 32bpp BMP(DIB) 条目，兼容性最好。"""
    payloads: list[tuple[int, bytes]] = []
    for size, img in frames:
        rgba = img.convert("RGBA")
        px = rgba.load()
        rows = []
        for y in range(size - 1, -1, -1):  # DIB 为自下而上
            row = bytearray()
            for x in range(size):
                r, g, b, a = px[x, y]
                row += bytes((b, g, r, a))
            rows.append(bytes(row))
        pixels = b"".join(rows)
        and_stride = ((size + 31) // 32) * 4
        and_mask = b"\x00" * (and_stride * size)
        header = struct.pack(
            "<IiiHHIIiiII", 40, size, size * 2, 1, 32, 0, len(pixels), 0, 0, 0, 0
        )
        payloads.append((size, header + pixels + and_mask))

    offset = 6 + 16 * len(payloads)
    directory = bytearray(struct.pack("<HHH", 0, 1, len(payloads)))
    body = bytearray()
    for size, payload in payloads:
        directory += struct.pack(
            "<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(payload), offset
        )
        offset += len(payload)
        body += payload
    out.write_bytes(bytes(directory + body))


def pixel_rows(img: Image.Image):
    """逐像素迭代。Pillow 12+ 起 getdata() 弃用（Pillow 14 移除），优先用新 API。"""
    getter = getattr(img, "get_flattened_data", None) or img.getdata
    return getter()


def role_mask(
    img: Image.Image,
    plate: tuple[int, int, int],
    mark: tuple[int, int, int],
    tol: int = 8,
    min_alpha: int = 32,
) -> list[int]:
    """逐像素归类：0=透明 1=底板 2=字块 3=抗锯齿 4=极低 alpha 边缘（不参与比对）。

    角色按语义而非单纯颜色，故可跨亮暗两版直接比对。tol 吸收 8bit premultiply
    往返的取整噪声；min_alpha 隔离圆角外缘 alpha ≤ 31 的不可见毛边——深色底板在
    极低 alpha 处会被预乘舍入成 (0,0,0)（10×15/255 → 0），纯白不会，若纳入比对
    会产生假阳性差异。
    """

    def close(pixel: tuple[int, int, int], target: tuple[int, int, int]) -> bool:
        return all(abs(a - b) <= tol for a, b in zip(pixel, target))

    roles: list[int] = []
    for r, g, b, a in pixel_rows(img.convert("RGBA")):
        if a == 0:
            roles.append(0)
        elif a < min_alpha:
            roles.append(4)
        elif close((r, g, b), plate):
            roles.append(1)
        elif close((r, g, b), mark):
            roles.append(2)
        else:
            roles.append(3)
    return roles


def ascii_grid(img: Image.Image) -> str:
    """把栅格图转成字符网格：█=字块，·=底板，▒=抗锯齿，空格=透明。"""
    rgba = img.convert("RGBA")
    lines = []
    for y in range(rgba.height):
        row = []
        for x in range(rgba.width):
            r, g, b, a = rgba.getpixel((x, y))
            if a == 0:
                row.append(" ")
                continue
            lum = (r * 299 + g * 587 + b * 114) // 1000
            if lum >= 150:
                row.append("█")
            elif lum <= 90:
                row.append("·")
            else:
                row.append("▒")
        lines.append("".join(row))
    return "\n".join(lines)


def svg_color_scan(path: Path) -> dict[str, object]:
    """扫描 SVG 中的硬编码色值。"""
    text = path.read_text(encoding="utf-8")
    hexes = re.findall(r"#[0-9A-Fa-f]{3,8}\b", text)
    funcs = re.findall(r"\b(?:rgb|rgba|hsl|hsla|oklch|oklab|color)\s*\(", text)
    keywords = re.findall(r"\b(?:fill|stroke|stop-color)\s*=\s*\"(white|black)\"", text)
    current = len(re.findall(r"currentColor", text))
    return {
        "hex": hexes,
        "color_functions": funcs,
        "mask_luminance_keywords": keywords,
        "currentColor_count": current,
    }


def main() -> int:
    report: dict[str, object] = {}
    WORK.mkdir(parents=True, exist_ok=True)
    for stale in WORK.glob("shot-*"):
        stale.unlink()

    master = UNIFIED / "logo.svg"
    dark_plate = UNIFIED / "logo-dark.svg"    # 黑底白块（浅色主题使用）
    light_plate = UNIFIED / "logo-light.svg"  # 白底黑块（深色主题使用）
    favicon_svg = UNIFIED / "favicon.svg"
    favicon_light_svg = UNIFIED / "favicon-light.svg"

    for path in (master, dark_plate, light_plate, favicon_svg, favicon_light_svg):
        if not path.exists():
            raise RuntimeError(f"缺少源文件：{path}")

    # ---------- 1. favicon.ico（16/32/48） ----------
    ico_frames = [(size, render(favicon_svg, size, "favicon")) for size in (16, 32, 48)]
    build_ico(ico_frames, UNIFIED / "favicon.ico")
    with Image.open(UNIFIED / "favicon.ico") as ico:
        report["favicon.ico 内含尺寸"] = sorted(ico.info.get("sizes", []))

    # ---------- 2. 派生位图（沿用仓库既有文件名与像素尺寸） ----------
    app_png_targets = {
        "react": [
            "logo.png",
            "logo-dark.png",
            "favicon.png",
            "favicon-96x96.png",
            "favicon_light.png",
            "apple-touch-icon.png",
            "web-app-manifest-192x192.png",
            "web-app-manifest-512x512.png",
        ],
        "next": [
            "logo.png",
            "logo-dark.png",
            "favicon.png",
            "favicon-96x96.png",
            "favicon_light.png",
            "apple-touch-icon.png",
            "web-app-manifest-192x192.png",
            "web-app-manifest-512x512.png",
        ],
        # Vue / Nuxt 于 2026-09-22 补入：此前本表只列 react / next / website，
        # 两端只拿到 SVG/ICO，缺 apple-touch-icon（iOS 加到主屏会退化成网页截图）
        # 与 web-app-manifest PNG。文件名与像素尺寸与 react / next 完全一致。
        "vue": [
            "logo.png",
            "logo-dark.png",
            "favicon.png",
            "favicon-96x96.png",
            "apple-touch-icon.png",
            "web-app-manifest-192x192.png",
            "web-app-manifest-512x512.png",
        ],
        "nuxt": [
            "logo.png",
            "logo-dark.png",
            "favicon.png",
            "favicon-96x96.png",
            "apple-touch-icon.png",
            "web-app-manifest-192x192.png",
            "web-app-manifest-512x512.png",
        ],
        "website": ["apple-touch-icon.png"],
    }

    # 目标文件名 → (渲染源 kind, 像素尺寸, 是否压白底)
    source_for: dict[str, tuple[str, int, bool]] = {
        "logo.png": ("brand-dark", 256, False),
        "logo-dark.png": ("brand-light", 256, False),
        "favicon.png": ("icon-dark", 64, True),
        "favicon-96x96.png": ("icon-dark", 96, False),
        "favicon_light.png": ("icon-light", 64, True),
        "apple-touch-icon.png": ("brand-dark", 180, False),
        "web-app-manifest-192x192.png": ("brand-dark", 192, False),
        "web-app-manifest-512x512.png": ("brand-dark", 512, False),
    }

    # 按目标像素尺寸缓存渲染结果
    cache: dict[tuple[str, int], Image.Image] = {}
    svg_of_kind = {
        "brand-dark": dark_plate,      # 黑底白块，品牌几何
        "brand-light": light_plate,    # 白底黑块，品牌几何
        "icon-dark": favicon_svg,      # 黑底白块，图标几何
        "icon-light": favicon_light_svg,  # 白底黑块，图标几何
    }

    def get(kind: str, size: int) -> Image.Image:
        key = (kind, size)
        if key not in cache:
            if kind not in svg_of_kind:
                raise ValueError(kind)
            cache[key] = render(svg_of_kind[kind], size, f"{kind}-{size}")
        return cache[key]

    def flatten_on_white(img: Image.Image) -> Image.Image:
        canvas = Image.new("RGB", img.size, (255, 255, 255))
        canvas.paste(img, mask=img.getchannel("A"))
        return canvas

    written_png: list[str] = []
    for app, files in app_png_targets.items():
        for target in files:
            kind, size, flatten = source_for[target]
            img = get(kind, size)
            out = APPS / app / "public" / target
            if flatten:
                flatten_on_white(img).save(out, "PNG", optimize=True)
            else:
                img.save(out, "PNG", optimize=True)
            written_png.append(f"apps/{app}/public/{target}")

    # 统一目录也留一份 256 位图，便于设计与外部系统直接取用
    get("brand-dark", 256).save(UNIFIED / "logo.png", "PNG", optimize=True)
    get("brand-light", 256).save(UNIFIED / "logo-dark.png", "PNG", optimize=True)
    written_png += ["assets/logo/logo.png", "assets/logo/logo-dark.png"]

    # ---------- 3. 安装 SVG / ICO 到各端 ----------
    # ⚠️ 命名对照（详见 docs/ui-spec.md §19）：
    #   assets/logo/ 按「图形自身外观」命名；apps/*/public/ 按「用于哪套主题」命名。
    #   两者语义相反，是刻意对齐仓库既有资产名（现有代码 import "/logo.svg" 等），
    #   故此处必须做一次映射，不要「顺手统一」。
    #   assets/logo/logo-dark.svg （黑底白块） → apps/*/public/logo.svg      （浅色主题用）
    #   assets/logo/logo-light.svg（白底黑块） → apps/*/public/logo-dark.svg （深色主题用）
    app_files = {
        "logo.svg": dark_plate,
        "logo-dark.svg": light_plate,
        "favicon.svg": favicon_svg,
        "favicon.ico": UNIFIED / "favicon.ico",
    }
    legacy_light_svg = {"react": favicon_light_svg, "next": favicon_light_svg}
    installed: dict[str, list[str]] = {}
    for app in ("react", "vue", "next", "nuxt", "website"):
        public = APPS / app / "public"
        public.mkdir(parents=True, exist_ok=True)
        touched = []
        for name, src in app_files.items():
            (public / name).write_bytes(src.read_bytes())
            touched.append(name)
        if app in legacy_light_svg:
            (public / "favicon_light.svg").write_bytes(legacy_light_svg[app].read_bytes())
            touched.append("favicon_light.svg")
        installed[app] = sorted(touched)
    report["各端安装"] = installed

    # ---------- 3a2. webmanifest（Vue / Nuxt）----------
    # 与上面 PNG 同批补入：缺 manifest 时移动端「添加到主屏」不会以独立应用形态打开。
    # react 的 site.webmanifest 早先手工创建、内容与此一致，不在此覆盖；next 走 App Router
    # 文件约定 metadata、当前未引用 manifest，故也不生成，避免留下无人引用的死资产。
    manifest_json = json.dumps(
        {
            "name": "Better Admin",
            "short_name": "Better Admin",
            "icons": [
                {
                    "src": "/web-app-manifest-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "maskable",
                },
                {
                    "src": "/web-app-manifest-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "maskable",
                },
            ],
            "theme_color": "#ffffff",
            "background_color": "#ffffff",
            "display": "standalone",
        },
        indent=2,
    )
    for app in ("vue", "nuxt"):
        (APPS / app / "public" / "site.webmanifest").write_text(
            manifest_json + "\n", encoding="utf-8", newline="\n"
        )
        report.setdefault("webmanifest 安装", []).append(
            f"apps/{app}/public/site.webmanifest"
        )

    # ---------- 3b. Next.js 文件约定图标（apps/next/src/app/） ----------
    # ⚠️ Next App Router 的 file-based metadata **优先于** layout.tsx 的 metadata.icons：
    #   这组文件会被自动编译成 <link rel="icon" ...> / <link rel="apple-touch-icon" ...>，
    #   浏览器标签页实际取的就是它。只换 public/ 会在这里留下一套旧品牌图标。
    next_app = APPS / "next" / "src" / "app"
    if next_app.is_dir():
        for name, src in (
            ("favicon.ico", UNIFIED / "favicon.ico"),
            ("icon0.svg", favicon_svg),
        ):
            (next_app / name).write_bytes(src.read_bytes())
        get("icon-dark", 96).save(next_app / "icon1.png", "PNG", optimize=True)
        get("brand-dark", 180).save(next_app / "apple-icon.png", "PNG", optimize=True)
        report["Next 文件约定图标"] = sorted(
            ["favicon.ico", "icon0.svg", "icon1.png", "apple-icon.png"]
        )

    # ---------- 4. preview.png ----------
    preview_dir = WORK / "preview"
    preview_dir.mkdir(parents=True, exist_ok=True)
    for size in (16, 20):
        render(favicon_svg, size, f"check-icon-{size}").save(preview_dir / f"icon-{size}.png")
        get("brand-dark", size).save(preview_dir / f"brand-dark-{size}.png")
        get("brand-light", size).save(preview_dir / f"brand-light-{size}.png")
    for size in (16, 32, 64, 128):
        get("brand-dark", size).save(preview_dir / f"brand-dark-{size}.png")
        get("brand-light", size).save(preview_dir / f"brand-light-{size}.png")
    for size in (64,):
        get("icon-dark", size).save(preview_dir / f"icon-dark-{size}.png")
        get("icon-light", size).save(preview_dir / f"icon-light-{size}.png")

    master_inline = master.read_text(encoding="utf-8")
    master_inline = re.sub(r"<\?xml[^>]*\?>", "", master_inline).strip()

    def cell(size: int, name: str, strip: str) -> str:
        # 页面与图片同目录，故用文件名级相对路径
        return (
            f'<div class="cell {strip}"><img src="{name}-{size}.png" '
            f'style="width:{size}px;height:{size}px" alt="{size}px"/>'
            f"<span class=\"cap\">{size}</span></div>"
        )

    dark_cells = "".join(cell(s, "brand-dark", "onlight") for s in (16, 32, 64, 128))
    light_cells = "".join(cell(s, "brand-light", "ondark") for s in (16, 32, 64, 128))

    page = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;padding:34px 38px;background:#F5F5F7;width:1000px;
    font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:#14161A}}
  h1{{font-size:19px;margin:0 0 6px;letter-spacing:-.01em}}
  .sub{{font-size:12.5px;color:#6B7280;margin:0 0 22px;line-height:1.7}}
  .block{{background:#fff;border:1px solid rgba(10,10,10,.08);border-radius:14px;
    padding:16px 20px 20px;margin-bottom:16px}}
  .block h2{{font-size:13px;margin:0 0 3px}}
  .block .hint{{font-size:11.5px;color:#6B7280;margin:0 0 14px}}
  .row{{display:flex;align-items:flex-end;gap:26px}}
  .cell{{display:flex;flex-direction:column;align-items:center;gap:7px;
    border-radius:10px;padding:0}}
  .cell img{{display:block}}
  .cell .cap{{font-size:10px;color:#6B7280;font-family:ui-monospace,Consolas,monospace}}
  .onlight{{background:#FFFFFF}}
  .ondark{{background:#0F1115;padding:12px 14px 8px}}
  .ondark .cap{{color:rgba(255,255,255,.55)}}
  .og{{display:flex;gap:16px}}
  .ogbox{{flex:1;border-radius:12px;display:flex;align-items:center;justify-content:center;
    padding:18px;gap:22px}}
  .ogbox.black{{background:#000}}
  .ogbox.white{{background:#fff;border:1px solid rgba(10,10,10,.1)}}
  .ogbox svg{{width:64px;height:64px;display:block}}
  .zoom{{display:flex;gap:34px;align-items:flex-end}}
  .zoom img{{image-rendering:pixelated;display:block}}
  .zoom figure{{margin:0;display:flex;flex-direction:column;align-items:center;gap:7px}}
  .zoom figcaption{{font-size:10.5px;color:#6B7280;text-align:center;
    font-family:ui-monospace,Consolas,monospace}}
</style></head>
<body>
  <h1>Better Admin — Logo 资源预览</h1>
  <p class="sub">真实像素渲染，未做任何缩放。上方两行为 16 / 32 / 64 / 128 原尺寸对照，下方为 ogimg 极限检查与 16px / 20px 像素放大自检。</p>

  <div class="block">
    <h2>亮色主题：黑底白块版（logo.svg 装配内容）</h2>
    <p class="hint">置于浅色界面底：16 / 32 / 64 / 128 px，原尺寸。</p>
    <div class="row">{dark_cells}</div>
  </div>

  <div class="block">
    <h2>暗色主题：白底黑块版（logo-dark.svg 装配内容）</h2>
    <p class="hint">置于深色界面底：16 / 32 / 64 / 128 px，原尺寸。</p>
    <div class="row">{light_cells}</div>
  </div>

  <div class="block">
    <h2>ogimg 极限检查：主版本（currentColor）在纯黑 / 纯白下</h2>
    <p class="hint">同一个 logo.svg，仅改 color：黑底取白、白底取黑，自动反色，块面积不变。</p>
    <div class="og">
      <div class="ogbox black" style="color:#FFFFFF">{master_inline}</div>
      <div class="ogbox white" style="color:#0A0A0A">{master_inline}</div>
    </div>
  </div>

  <div class="block">
    <h2>像素放大自检：16px / 20px 图标栅格（8 倍最近邻放大）</h2>
    <p class="hint">放大后可见真实像素：16px 下竖柱 4px、两碗间距 2px、字腔 3×2.25px；20px 下依次为 5 / 2.5 / 3.75×2.81px。</p>
    <div class="zoom">
      <figure><img src="icon-16.png" style="width:128px;height:128px" alt="16px 放大"/><figcaption>图标几何 16px ×8</figcaption></figure>
      <figure><img src="icon-20.png" style="width:160px;height:160px" alt="20px 放大"/><figcaption>图标几何 20px ×8</figcaption></figure>
      <figure><img src="brand-dark-20.png" style="width:160px;height:160px" alt="品牌几何 20px 放大"/><figcaption>品牌几何 20px ×8</figcaption></figure>
      <figure><img src="brand-dark-64.png" style="width:128px;height:128px" alt="64px 原尺寸"/><figcaption>品牌几何 64px ×2</figcaption></figure>
    </div>
  </div>
</body></html>
"""
    preview_html = preview_dir / "preview.html"
    preview_html.write_text(page, encoding="utf-8")
    out = WORK / "preview-shot.png"
    cmd = [
        str(chrome_bin()),
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={WORK / 'profile'}",
        "--force-device-scale-factor=1",
        "--window-size=1000,1180",
        f"--screenshot={out}",
        preview_html.as_uri(),
    ]
    subprocess.run(cmd, capture_output=True, check=False)
    shot = Image.open(out).convert("RGB")
    # 裁掉底部多余背景
    bg = shot.getpixel((4, 4))
    bottom = shot.height
    for y in range(shot.height - 1, 0, -1):
        row_colors = shot.crop((0, y, shot.width, y + 1)).getcolors(maxcolors=4096)
        if not all(color == bg for _, color in row_colors):
            bottom = min(shot.height, y + 34)
            break
    shot.crop((0, 0, shot.width, bottom)).save(UNIFIED / "preview.png", "PNG", optimize=True)
    report["preview.png 尺寸"] = list(Image.open(UNIFIED / "preview.png").size)

    # ---------- 5. 验收自检 ----------
    dark128 = get("brand-dark", 128)
    light128 = get("brand-light", 128)
    mask_dark = role_mask(dark128, PLATE_DARK, PLATE_LIGHT)
    mask_light = role_mask(light128, PLATE_LIGHT, PLATE_DARK)
    compared = [(a, b) for a, b in zip(mask_dark, mask_light) if a != 4 and b != 4]
    mismatches = sum(1 for a, b in compared if a != b)
    ignored = sum(1 for a, b in zip(mask_dark, mask_light) if a == 4 or b == 4)
    alpha_diff = ImageChops.difference(dark128.getchannel("A"), light128.getchannel("A"))

    def tally(mask: list[int]) -> dict[str, int]:
        names = {0: "透明", 1: "底板", 2: "字块", 3: "抗锯齿", 4: "边缘忽略区"}
        return {names[key]: mask.count(key) for key in names}

    report["亮暗两版一致性（品牌几何 128px）"] = {
        "比对像素数": len(compared),
        "角色不一致像素数": mismatches,
        "边缘忽略区像素数": ignored,
        "Alpha 通道最大差": max(alpha_diff.getextrema()),
        "黑底白块版": tally(mask_dark),
        "白底黑块版": tally(mask_light),
        "结论": (
            "逐像素角色完全一致（块面积、圆角、间距无差异）"
            if mismatches == 0
            else "存在差异，需排查"
        ),
    }

    grids = {}
    for geometry, svg in (("图标几何", favicon_svg), ("品牌几何", dark_plate)):
        for size in (16, 20):
            img = render(svg, size, f"grid-{geometry}-{size}")
            grids[f"{geometry} {size}px"] = ascii_grid(img)
    report["字符栅格"] = grids
    report["16px 字符栅格"] = grids["图标几何 16px"]
    report["20px 字符栅格"] = grids["图标几何 20px"]

    report["色值扫描"] = {
        "assets/logo/logo.svg": svg_color_scan(master),
        "assets/logo/logo-dark.svg": svg_color_scan(dark_plate),
        "assets/logo/logo-light.svg": svg_color_scan(light_plate),
        "assets/logo/favicon.svg": svg_color_scan(favicon_svg),
        "assets/logo/favicon-light.svg": svg_color_scan(favicon_light_svg),
    }

    report["派生位图"] = written_png
    (WORK / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    printable = {k: v for k, v in report.items() if k != "字符栅格"}
    print(json.dumps(printable, ensure_ascii=False, indent=2))
    for name, grid in grids.items():
        print(f"\n--- {name} 字符栅格（█=字块 ·=底板 ▒=抗锯齿）---")
        print(grid)
    return 0


if __name__ == "__main__":
    sys.exit(main())
