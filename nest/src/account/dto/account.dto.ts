import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { type TransformFnParams, Transform } from 'class-transformer';

/** 剥离可选协议与平台主页前缀，trim 后返回剩余裸值；空串归一为 null（语义 = 清空） */
function stripPrefix(pattern: RegExp) {
  return ({ value }: TransformFnParams): string | null | undefined => {
    if (typeof value !== 'string') return value;
    const stripped = value.trim().replace(pattern, '');
    return stripped === '' ? null : stripped;
  };
}

/** PUT /api/account/profile 请求体（自助修改基本信息，字段缺省表示不修改） */
export class UpdateAccountProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  displayName?: string;

  /** 电话，可传 null 清空；允许 + 前缀与数字、空格、短横线，4-20 位 */
  @IsOptional()
  @Matches(/^\+?[0-9][0-9\- ]{3,19}$/, {
    message: '电话格式不正确',
  })
  phone?: string | null;

  /** 个人标签全量替换；服务端逐项 trim、去空、去重（超限 400 VALIDATION_ERROR） */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  /**
   * 个人网站裸域名（v1.5.2）：剥离 http(s):// 后校验「域名 + 可选端口 + 可选路径」，
   * 展示前缀 https:// 由前端拼接；null 清空、缺省不修改
   */
  @IsOptional()
  @Transform(stripPrefix(/^https?:\/\//i))
  @Matches(
    /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}(?::\d{1,5})?(?:\/\S*)?$/,
    { message: '网站格式不正确，示例：baidu.com' },
  )
  website?: string | null;

  /** GitHub 用户名裸值（v1.5.2）：剥离 GitHub 主页前缀后校验 1-39 位官方用户名字符集 */
  @IsOptional()
  @Transform(stripPrefix(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i))
  @Matches(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, {
    message: 'GitHub 用户名格式不正确',
  })
  githubUsername?: string | null;

  /** X（Twitter）用户名裸值（v1.5.2）：剥离 X/Twitter 主页前缀后校验 4-15 位 */
  @IsOptional()
  @Transform(
    stripPrefix(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i),
  )
  @Matches(/^[a-zA-Z0-9_]{4,15}$/, {
    message: 'X 用户名格式不正确',
  })
  xUsername?: string | null;
}

/** PUT /api/account/email 请求体（需当前密码确认） */
export class UpdateAccountEmailDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(1)
  currentPassword!: string;
}

/** PUT /api/account/password 请求体（成功后 tokenVersion+1 全端强制下线） */
export class UpdateAccountPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
