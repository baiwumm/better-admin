/**
 * 主题防闪烁 bootstrap 脚本（首帧前同步执行的内联 <head> 脚本）。
 *
 * 设计动机：React 版在 createRoot 渲染前同步执行 initDesignTheme()（SPA 无
 * SSR，天然无闪烁）；App Router 的客户端 store 初始化发生在水合之后，若不在
 * 首帧前把偏好应用到 <html>，深色主题/自定义色板会出现「先浅后深」的闪白。
 *
 * 本脚本与 stores/design-theme-store.ts 的读取规则保持一致（键名、合法值、
 * 默认档），仅做「读 localStorage → 应用 DOM 属性」一件事；store 状态由
 * Providers 挂载后的 initDesignTheme() 幂等同步（DOM 已就绪，仅校正状态并
 * 注册 matchMedia 监听）。两处逻辑必须同步维护，改动键名/档位时两边一起改。
 */

/** 与 design-theme-store 对齐的 localStorage 键与合法值。 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var d=document.documentElement,ls=localStorage,palettes=["default","sky","lavender","mint","netflix","uber","spotify","coinbase","airbnb","discord","rabbit"],radii=["none","small","medium","large"],rts=["fade","glide","rise","zoom","reveal","cover","circle","blur"],spd=["slow","fast"];function setAttr(n,v){v?d.setAttribute(n,v):d.removeAttribute(n);}
var t=ls.getItem("better-admin-design-theme");setAttr("data-design-theme",t&&palettes.indexOf(t)>0?t:null);
var cv=ls.getItem("better-admin-color-vision");setAttr("data-color-vision",cv==="grayscale"||cv==="color-weak"?cv:null);
var r=ls.getItem("better-admin-radius");setAttr("data-radius",r&&radii.indexOf(r)>-1&&r!=="medium"?r:null);
var rt=ls.getItem("better-admin-route-transition");setAttr("data-route-transition",rt&&rts.indexOf(rt)>-1?rt:null);
var sp=ls.getItem("better-admin-route-transition-speed");setAttr("data-rt-speed",sp&&spd.indexOf(sp)>-1?sp:null);
var m=ls.getItem("better-admin-theme-mode"),sys=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches,res=m==="light"||m==="dark"?m:sys?"dark":"light";
d.classList.remove("light","dark");d.classList.add(res);d.setAttribute("data-theme",res);}catch(e){}})();`;
