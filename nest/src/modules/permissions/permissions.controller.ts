import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(AuthGuard('jwt'))
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /** GET /api/permissions — 权限点全量字典（需登录） */
  @Get()
  list() {
    return this.permissionsService.list();
  }
}
