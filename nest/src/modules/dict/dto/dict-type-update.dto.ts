import { IsOptional, IsString } from 'class-validator';

/** PUT /api/dict/types/:code 请求体 */
export class DictTypeUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
