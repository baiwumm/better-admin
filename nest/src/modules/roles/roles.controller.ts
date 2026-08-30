import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RolesService, RoleView } from './roles.service';
import { CreateRoleDto } from './dto/role-create.dto';
import { UpdateRoleDto } from './dto/role-update.dto';
import { RoleMenusUpdateDto } from './dto/role-menus.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AuthUser } from '../../auth/auth.service';

@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private operatorId(req: Request): string | null {
    return (req.user as AuthUser)?.id ?? null;
  }

  /** GET /api/roles */
  @Get()
  @Permissions('SEARCH')
  findAll(@Query() query: RoleQueryDto) {
    return this.rolesService.findAll(query);
  }

  /** GET /api/roles/:id */
  @Get(':id')
  @Permissions('SEARCH')
  findOne(@Param('id') id: string): Promise<RoleView> {
    return this.rolesService.findOne(id);
  }

  /** GET /api/roles/:id/menus */
  @Get(':id/menus')
  @Permissions('SEARCH')
  getMenus(@Param('id') id: string) {
    return this.rolesService.getMenus(id);
  }

  /** POST /api/roles */
  @Post()
  @Permissions('ADD')
  create(@Body() dto: CreateRoleDto, @Req() req: Request): Promise<RoleView> {
    return this.rolesService.create(dto, this.operatorId(req));
  }

  /** PUT /api/roles/:id */
  @Put(':id')
  @Permissions('EDIT')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ): Promise<RoleView> {
    return this.rolesService.update(id, dto, this.operatorId(req));
  }

  /** PUT /api/roles/:id/menus — 菜单授权独立位（v1.4.4），不复用 EDIT */
  @Put(':id/menus')
  @Permissions('GRANT')
  updateMenus(
    @Param('id') id: string,
    @Body() dto: RoleMenusUpdateDto,
    @Req() req: Request,
  ) {
    return this.rolesService.updateMenus(id, dto, this.operatorId(req));
  }

  /** DELETE /api/roles/:id */
  @Delete(':id')
  @Permissions('DELETE')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.rolesService.remove(id, this.operatorId(req));
  }
}
