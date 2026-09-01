import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DirectoryService } from './directory.service';
import { DirectoryQueryDto } from './dto/directory-query.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

/** 人员通讯录（契约 v1.6.0）：全员视图，供查询与引用 */
@Controller('org/directory')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  /** GET /api/org/directory */
  @Get()
  @Permissions('SEARCH')
  findAll(@Query() query: DirectoryQueryDto) {
    return this.directoryService.findAll(query);
  }
}
