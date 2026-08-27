import { IsOptional, IsString } from 'class-validator';

/**
 * 登出请求体（可选）。
 * - 传入 refreshToken：仅撤销该设备会话（精确撤销单行托管记录）；
 * - 不传 / 空体 {}：撤销该用户全部会话（全端下线）。
 * 兼容不带任何 body 的调用（字段整体可选）。
 */
export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
