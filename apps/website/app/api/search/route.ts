import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

/**
 * 站内搜索索引（静态导出链路，同 react-okr-tree 站）：
 * `force-static` + `staticGET` 让 `next build` 把索引原样写到 out/api/search 静态文件，
 * 前端 RootProvider 的 staticClient（type:'static'）在浏览器里拉取后本地搜索——
 * 不存在服务端运行时，也不是真 Route Handler。
 */
export const dynamic = 'force-static';

export const { staticGET: GET } = createFromSource(source);
