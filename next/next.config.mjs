/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL("https://cbqzqhiqjasshpmunpmo.supabase.co/**")],
    unoptimized: true, // 禁用 Vercel 图片优化
  },
};

export default nextConfig;
