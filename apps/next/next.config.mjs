/** @type {import('next').NextConfig} */
const nextConfig = {
  // 显式固定 Turbopack root 为本应用目录：仓库为「无 workspace 的多独立
  // 应用」结构（AGENTS §3），自动推断依赖 lockfile 查找，仓库根一旦出现
  // pnpm-lock.yaml（如误跑 pnpm install 的本地残留）就会误判，把模块解析
  // 与文件监视范围扩大到整个仓库。apps/next 内无越出本目录的文件引用。
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    // React <ViewTransition> 的 Next 集成（路由导航期间触发过渡），
    // 路由切换动画依赖，见 app/(authenticated)/admin-shell.tsx
    viewTransition: true,
  },
  images: {
    remotePatterns: [new URL("https://cbqzqhiqjasshpmunpmo.supabase.co/**")],
    unoptimized: true, // 禁用 Vercel 图片优化
  },
};

export default nextConfig;
