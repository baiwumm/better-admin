import { IsIn } from 'class-validator';

/** PUT /api/users/:id/status 请求体 */
export class StatusUpdateDto {
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}
