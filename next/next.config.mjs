/** @type {import('next').NextConfig} */
const nextConfig = {
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
