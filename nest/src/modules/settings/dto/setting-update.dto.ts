import { IsDefined } from 'class-validator';

/**
 * PUT /api/settings/:key 请求体。
 * value 为 jsonb，可为字符串/数字/布尔/对象；具体类型由 Service 按 key 注册表校验。
 */
export class SettingUpdateDto {
  @IsDefined({ message: 'value 不能为空' })
  value!: unknown;
}
