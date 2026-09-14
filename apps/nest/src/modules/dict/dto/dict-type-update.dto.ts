import { IsOptional, IsString, Length } from 'class-validator';

/** PUT /api/dict/types/:code 请求体 */
export class DictTypeUpdateDto {
  @IsOptional()
  @IsString()
  @Length(1, 20)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;
}
