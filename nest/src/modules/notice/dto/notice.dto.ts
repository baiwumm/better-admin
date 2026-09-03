import { IsArray, IsIn, IsOptional, IsString, MaxLength, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** 发布范围单项（与 NoticeScope 对齐） */
/** 发布范围类型（与 openapi.yaml NoticeScopeType 对齐） */
type NoticeScopeType = 'dept' | 'post' | 'user';

export class NoticeScopeInputDto {
  @IsIn(['dept', 'post', 'user'])
  scopeType!: NoticeScopeType;

  @IsString()
  targetId!: string;
}

/** POST /api/notices 请求体（与 NoticeCreateRequest 对齐） */
export class NoticeCreateDto {
  @IsString()
  @MaxLength(50)
  title!: string;

  /** 富文本内容（Tiptap HTML，非空；渲染端消毒防 XSS） */
  @IsString()
  content!: string;

  @IsArray()
  @Type(() => NoticeScopeInputDto)
  @ValidateNested({ each: true })
  scopeTargets!: NoticeScopeInputDto[];

  @IsOptional()
  isTop?: boolean;

  /** 发布时间；缺省或早于当前时间 = 立即发布，晚于当前时间 = 定时发布 */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/, {
    message: 'publishTime 必须是合法的 ISO 日期时间',
  })
  publishTime?: string | null;
}

/** PUT /api/notices/:id 请求体（与 NoticeUpdateRequest 对齐；缺省表示不修改） */
export class NoticeUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @Type(() => NoticeScopeInputDto)
  @ValidateNested({ each: true })
  scopeTargets?: NoticeScopeInputDto[];

  @IsOptional()
  isTop?: boolean;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/, {
    message: 'publishTime 必须是合法的 ISO 日期时间',
  })
  publishTime?: string | null;
}
