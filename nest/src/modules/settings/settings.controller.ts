import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { SettingQueryDto } from './dto/setting-query.dto';
import { SettingUpdateDto } from './dto/setting-update.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AuthUser } from '../../auth/auth.service';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  private operatorId(req: Request): string | null {
    return (req.user as AuthUser)?.id ?? null;
  }

  /** GET /api/settings */
  @Get()
  @Permissions('SEARCH')
  list(@Query() query: SettingQueryDto) {
    return this.settingsService.list(query);
  }

  /** GET /api/settings/:key */
  @Get(':key')
  @Permissions('SEARCH')
  getByKey(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }

  /** PUT /api/settings/:key（独立位 SETTINGS_UPDATE，不与菜单 EDIT 复用） */
  @Put(':key')
  @Permissions('SETTINGS_UPDATE')
  update(
    @Param('key') key: string,
    @Body() dto: SettingUpdateDto,
    @Req() req: Request,
  ) {
    return this.settingsService.update(key, dto, this.operatorId(req));
  }
}
