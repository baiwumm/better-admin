import { IsOptional, IsString } from 'class-validator';

/** POST /api/dict/types 请求体 */
export class DictTypeCreateDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
