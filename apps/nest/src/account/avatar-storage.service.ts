import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** 允许上传的图片类型 → 存储扩展名 */
const AVATAR_MIME_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** 头像大小上限（2MB，与契约一致） */
const AVATAR_MAX_SIZE = 2 * 1024 * 1024;

/** 公开 bucket 名（由 pnpm storage:init 幂等创建） */
const AVATAR_BUCKET = 'avatars';

/**
 * Supabase Storage 头像存储服务（v1.5.0）。
 *
 * - 浏览器端不接触密钥：由 Nest 后端持 sb_secret 密钥中转上传（新 API key 体系，
 *   supabase-js 同时设置 apikey 与等值 Authorization 头，天然兼容）。
 * - 每用户固定一张头像：文件名 {userId}.{ext}，同名覆盖（upsert）。
 * - 返回 URL 带时间戳查询参数：同名覆盖后穿透 CDN / 浏览器缓存。
 */
@Injectable()
export class AvatarStorageService {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error(
        '[avatar-storage] SUPABASE_URL / SUPABASE_SECRET_KEY 未设置，无法上传头像',
      );
    }
    this.client = createClient(url, key, { auth: { persistSession: false } });
    return this.client;
  }

  /** 校验上传文件（类型白名单 + 大小上限），不符合抛业务错误码 */
  assertValidFile(file: { mimetype?: string; size?: number }): { ext: string } {
    const ext = file.mimetype ? AVATAR_MIME_EXT[file.mimetype] : undefined;
    if (!ext) {
      throw new BadRequestException({
        code: 'AVATAR_FILE_INVALID',
        message: '头像文件类型不支持，仅支持 webp / png / jpeg',
      });
    }
    if (!file.size || file.size <= 0) {
      throw new BadRequestException({
        code: 'AVATAR_FILE_INVALID',
        message: '头像文件为空',
      });
    }
    if (file.size > AVATAR_MAX_SIZE) {
      throw new BadRequestException({
        code: 'AVATAR_FILE_TOO_LARGE',
        message: '头像文件不能超过 2MB',
      });
    }
    return { ext };
  }

  /**
   * 上传头像并返回公开访问 URL（带缓存穿透时间戳）。
   * Storage 写入失败抛 500 AVATAR_UPLOAD_FAILED。
   */
  async upload(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<string> {
    const { ext } = this.assertValidFile(file);
    const path = `${userId}.${ext}`;
    const { error } = await this.getClient().storage
      .from(AVATAR_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
    if (error) {
      throw new InternalServerErrorException({
        code: 'AVATAR_UPLOAD_FAILED',
        message: '头像上传失败，请稍后重试',
      });
    }
    const base = process.env.SUPABASE_URL;
    return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}?v=${Date.now()}`;
  }

  /**
   * 尽力删除 Storage 对象（删除头像用）。对象不存在或删除失败不抛错——
   * 删除头像的主语义是「置空 users.avatar」，孤儿对象仅记录日志，不阻断请求。
   */
  async removeObject(objectPath: string): Promise<void> {
    try {
      const { error } = await this.getClient()
        .storage.from(AVATAR_BUCKET)
        .remove([objectPath]);
      if (error) {
        console.error(`[avatar-storage] 删除对象失败(${objectPath}):`, error.message);
      }
    } catch (err) {
      console.error(`[avatar-storage] 删除对象异常(${objectPath}):`, err);
    }
  }
}
