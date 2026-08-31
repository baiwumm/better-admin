import { config } from 'dotenv';

/**
 * Supabase Storage bucket 初始化脚本（v1.5.0 我的账户头像上传）。
 *
 * 用法：pnpm storage:init（幂等，bucket 已存在时跳过）
 * 依赖环境变量：
 *   - SUPABASE_URL：项目地址（https://xxx.supabase.co）
 *   - SUPABASE_SECRET_KEY：新 API key 体系的 sb_secret_ 密钥（服务端专用）
 *
 * 注意：新 API key 不是 JWT，必须放在 apikey 请求头中
 * （Authorization: Bearer 会被当 JWT 解析后拒绝，见 Supabase 迁移文档）。
 */
config();

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY 环境变量未设置，无法初始化 Storage。');
}

const BUCKET_NAME = 'avatars';

async function run() {
  // eslint-disable-next-line no-console
  console.log(`[storage] 检查 bucket ${BUCKET_NAME} ...`);
  const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      apikey: secretKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: BUCKET_NAME, public: true }),
  });

  if (res.ok) {
    // eslint-disable-next-line no-console
    console.log(`[storage] bucket ${BUCKET_NAME} 创建成功（public read）。`);
    return;
  }

  const body = (await res.json().catch(() => null)) as
    | { error?: string; message?: string; statusCode?: string }
    | null;
  // bucket 已存在视为幂等成功（错误码 "Bucket already exists" / 409）
  if (body?.error === 'Bucket already exists' || body?.statusCode === '409') {
    // eslint-disable-next-line no-console
    console.log(`[storage] bucket ${BUCKET_NAME} 已存在，跳过。`);
    return;
  }
  throw new Error(`[storage] bucket 创建失败: HTTP ${res.status} ${JSON.stringify(body)}`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err);
  process.exit(1);
});
