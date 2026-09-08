import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { DICT_TYPE_CODE_PATTERN } from '@/lib/constants';

/** POST /api/dict/types 请求体 */
export class DictTypeCreateDto {
  @IsString()
  @Length(1, 50)
  @Matches(DICT_TYPE_CODE_PATTERN, {
    message: 'code 必须以字母开头，仅含字母、数字、下划线、中划线',
  })
  code!: string;

  @IsString()
  @Length(1, 20)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;
}
