import { IsIn } from 'class-validator';

/** 快捷登录种类（契约 v1.10.0 DemoLoginRequest.kind） */
export const DEMO_LOGIN_KINDS = ['admin', 'random'] as const;
export type DemoLoginKind = (typeof DEMO_LOGIN_KINDS)[number];

export class DemoLoginDto {
  /**
   * admin：从「系统管理员」演示角色用户中随机一人；
   * random：先从其余演示角色等概率选一个，再从该角色用户中随机一人。
   */
  @IsIn(DEMO_LOGIN_KINDS)
  kind!: DemoLoginKind;
}
