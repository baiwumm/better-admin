import "server-only";

import { nanoid } from "nanoid";

// 生成与 Nest 端（nanoid $defaultFn）一致风格的记录主键，双端写入同一库时
// 行数据形态一致；pulled schema 无法内省到客户端默认值，插入时显式提供。
export function generateRecordId(): string {
  return nanoid();
}
