import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from './logs.service';
import { LogQueryDto } from './dto/log-query.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

@Controller('logs')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /** GET /api/logs — 分页列表（支持 type 过滤，created_at 倒序） */
  @Get()
  @Permissions('SEARCH')
  list(@Query() query: LogQueryDto) {
    return this.logsService.list(query);
  }

  /** GET /api/logs/:id — 单条详情 */
  @Get(':id')
  @Permissions('SEARCH')
  findOne(@Param('id') id: string) {
    return this.logsService.findOne(id);
  }

  /** DELETE /api/logs/:id — 删除单条（人工干预清理） */
  @Delete(':id')
  @Permissions('DELETE')
  remove(@Param('id') id: string) {
    return this.logsService.remove(id);
  }
}
