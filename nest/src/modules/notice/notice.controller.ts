import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { NoticesService } from './notice.service';
import { NoticeCreateDto, NoticeUpdateDto } from './dto/notice.dto';
import {
  NoticeMineQueryDto,
  NoticeQueryDto,
  NoticeReadStatsQueryDto,
} from './dto/notice-query.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AuthUser } from '../../auth/auth.service';

/**
 * 公告管理（契约 v1.7.0）。
 *
 * - 管理接口挂 @Permissions 位掩码；mine / 详情为全员消费接口
 *   （无 @Permissions，PermissionsGuard 对无元数据路由放行）；
 * - 静态路由 mine 声明在 :id 参数路由之前；
 * - 详情接口在服务端做可见性校验并自动记录首次已读（IP 取自请求）。
 */
@Controller('notices')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  private operator(req: Request): { user: AuthUser; ip: string } {
    return {
      user: req.user as AuthUser,
      ip: req.ip ?? '',
    };
  }

  /** GET /api/notices/mine —— 我的公告（全员，置顶在前） */
  @Get('mine')
  findMine(@Query() query: NoticeMineQueryDto, @Req() req: Request) {
    const user = this.operator(req).user;
    return this.noticesService.findMine(user.id, query);
  }

  /** GET /api/notices —— 公告管理列表 */
  @Get()
  @Permissions('SEARCH')
  findAll(@Query() query: NoticeQueryDto) {
    return this.noticesService.findAll(query);
  }

  /** POST /api/notices —— 发布公告 */
  @Post()
  @HttpCode(200)
  @Permissions('ADD')
  create(@Body() dto: NoticeCreateDto, @Req() req: Request) {
    const { user } = this.operator(req);
    return this.noticesService.create(dto, user);
  }

  /** GET /api/notices/:id —— 详情（范围内自动记首读） */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const { user, ip } = this.operator(req);
    return this.noticesService.findVisibleDetail(id, user, ip);
  }

  /** PUT /api/notices/:id —— 编辑公告 */
  @Put(':id')
  @Permissions('EDIT')
  update(
    @Param('id') id: string,
    @Body() dto: NoticeUpdateDto,
    @Req() req: Request,
  ) {
    const { user } = this.operator(req);
    return this.noticesService.update(id, dto, user);
  }

  /** DELETE /api/notices/:id —— 删除公告（软删） */
  @Delete(':id')
  @Permissions('DELETE')
  remove(@Param('id') id: string, @Req() req: Request) {
    const { user } = this.operator(req);
    return this.noticesService.remove(id, user);
  }

  /** POST /api/notices/:id/withdraw —— 撤回公告 */
  @Post(':id/withdraw')
  @HttpCode(200)
  @Permissions('EDIT')
  withdraw(@Param('id') id: string, @Req() req: Request) {
    const { user } = this.operator(req);
    return this.noticesService.withdraw(id, user);
  }

  /** GET /api/notices/:id/read-stats —— 已读/未读名单 */
  @Get(':id/read-stats')
  @Permissions('SEARCH')
  readStats(
    @Param('id') id: string,
    @Query() query: NoticeReadStatsQueryDto,
  ) {
    return this.noticesService.findReadStats(id, query);
  }

  /** POST /api/notices/:id/remind —— 一键催办 */
  @Post(':id/remind')
  @HttpCode(200)
  @Permissions('EDIT')
  remind(@Param('id') id: string, @Req() req: Request) {
    const { user } = this.operator(req);
    return this.noticesService.remind(id, user);
  }
}
