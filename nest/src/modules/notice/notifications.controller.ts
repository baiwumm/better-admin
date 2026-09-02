import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthUser } from '../../auth/auth.service';

/**
 * 站内信铃铛（契约 v1.7.0）：仅登录态（无权限位），数据严格限定当前用户。
 * 静态路由 unread-count / read-all 声明在 :id 参数路由之前。
 */
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private userId(req: Request): string {
    return (req.user as AuthUser)?.id ?? '';
  }

  /** GET /api/notifications —— 通知列表（铃铛面板） */
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Req() req?: Request,
  ) {
    return this.notificationsService.findAll(this.userId(req!), {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      unreadOnly: unreadOnly === 'true',
    });
  }

  /** GET /api/notifications/unread-count —— 未读数（红点轮询） */
  @Get('unread-count')
  unreadCount(@Req() req: Request) {
    return this.notificationsService.unreadCount(this.userId(req));
  }

  /** POST /api/notifications/read-all —— 全部已读 */
  @Post('read-all')
  readAll(@Req() req: Request) {
    return this.notificationsService.readAll(this.userId(req));
  }

  /** POST /api/notifications/:id/read —— 单条已读 */
  @Post(':id/read')
  readOne(@Param('id') id: string, @Req() req: Request) {
    return this.notificationsService.readOne(this.userId(req), id);
  }
}
