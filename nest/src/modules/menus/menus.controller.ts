import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { MenusService, MenuNode } from './menus.service';
import { CreateMenuDto } from './dto/menu-create.dto';
import { UpdateMenuDto } from './dto/menu-update.dto';
import { AddChildDto } from './dto/menu-add-child.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AuthUser } from '../../auth/auth.service';

@Controller('menus')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  private operatorId(req: Request): string | null {
    return (req.user as AuthUser)?.id ?? null;
  }

  /**
   * GET /api/menus — 菜单树（含 userPermissions）。
   *
   * 仅需登录（AuthGuard），不要求 SEARCH 位：菜单树本身就是「当前用户角色关联
   * 的可见菜单视图」，无角色用户应能拿到空数组以正确渲染空状态。
   */
  @Get()
  findTree(@Req() req: Request): Promise<MenuNode[]> {
    return this.menusService.findTree((req.user as AuthUser) ?? null);
  }

  /**
   * GET /api/menus/tree — 管理用全量菜单树（契约 v1.3）。
   *
   * 不做角色可见性过滤（含停用/隐藏节点），须持有菜单 SEARCH 位；
   * userPermissions 仍按当前用户下发，供前端操作按钮门控。
   * 注意：必须声明在 @Get(':id') 之前，避免 'tree' 被当作 id 参数匹配。
   */
  @Get('tree')
  @Permissions('SEARCH')
  findManageTree(@Req() req: Request): Promise<MenuNode[]> {
    return this.menusService.findManageTree((req.user as AuthUser) ?? null);
  }

  /** GET /api/menus/:id — 菜单详情 */
  @Get(':id')
  @Permissions('SEARCH')
  findOne(@Param('id') id: string, @Req() req: Request): Promise<MenuNode> {
    return this.menusService.findOne(id, (req.user as AuthUser) ?? null);
  }

  /** POST /api/menus */
  @Post()
  @Permissions('ADD')
  create(@Body() dto: CreateMenuDto, @Req() req: Request) {
    return this.menusService.create(dto, this.operatorId(req));
  }

  /** POST /api/menus/:id/add-child */
  @Post(':id/add-child')
  @Permissions('ADD_CHILD')
  addChild(
    @Param('id') id: string,
    @Body() dto: AddChildDto,
    @Req() req: Request,
  ) {
    return this.menusService.addChild(id, dto, this.operatorId(req));
  }

  /** PUT /api/menus/:id */
  @Put(':id')
  @Permissions('EDIT')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuDto,
    @Req() req: Request,
  ) {
    return this.menusService.update(id, dto, this.operatorId(req));
  }

  /** DELETE /api/menus/:id */
  @Delete(':id')
  @Permissions('DELETE')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.menusService.remove(id, this.operatorId(req));
  }
}
