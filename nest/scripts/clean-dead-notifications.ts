import 'dotenv/config';
import { and, inArray, isNull, like, not } from 'drizzle-orm';
import { db } from '../src/db/client';
import { notices, notifications } from '../src/db/schema';

/**
 * 幂等清理：删除指向「已软删或不存在公告」的站内信（notice_publish 类）。
 *
 * 背景：公告删除（软删）自本版本起会在同一事务内清理关联站内信；此前产生的
 * 存量失效通知仍留在铃铛列表，点击进详情报 NOTICE_NOT_FOUND（404）。
 * 本脚本一次性清掉这些死通知（link 指向 /org/notices/{id} 且公告已软删或不存在），
 * 重复执行无副作用。
 *
 * 运行：pnpm --dir nest exec ts-node scripts/clean-dead-notifications.ts
 */

const NOTICE_LINK_PREFIX = '/org/notices/';

async function main() {
  // 站内信中所有指向公告详情的通知
  const rows = await db
    .select({ id: notifications.id, link: notifications.link })
    .from(notifications)
    .where(like(notifications.link, `${NOTICE_LINK_PREFIX}%`));

  if (rows.length === 0) {
    console.log('[clean-dead-notifications] 无指向公告详情的站内信，无事可做');
    return;
  }

  const noticeIds = [
    ...new Set(rows.map((r) => r.link!.slice(NOTICE_LINK_PREFIX.length))),
  ];

  // 仍存在的未删除公告 id 集合
  const alive = await db
    .select({ id: notices.id })
    .from(notices)
    .where(and(inArray(notices.id, noticeIds), isNull(notices.deletedAt)));
  const aliveIds = new Set(alive.map((r) => r.id));

  const deadIds = noticeIds.filter((id) => !aliveIds.has(id));

  if (deadIds.length === 0) {
    console.log(
      `[clean-dead-notifications] ${rows.length} 条公告通知全部指向存活公告，无事可做`,
    );
    return;
  }

  // 清理 link 指向失效公告的站内信（排除存活公告，兼容 link 尾部异常格式的行）
  const deleted = await db
    .delete(notifications)
    .where(
      and(
        like(notifications.link, `${NOTICE_LINK_PREFIX}%`),
        not(
          inArray(
            notifications.link,
            [...aliveIds].map((id) => `${NOTICE_LINK_PREFIX}${id}`),
          ),
        ),
      ),
    )
    .returning({ id: notifications.id });

  console.log(
    `[clean-dead-notifications] 失效公告 ${deadIds.length} 个，已清理死通知 ${deleted.length} 条`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[clean-dead-notifications] 执行失败:', err);
    process.exit(1);
  });
