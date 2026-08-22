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
import { DictService } from './dict.service';
import { DictTypeCreateDto } from './dto/dict-type-create.dto';
import { DictTypeUpdateDto } from './dto/dict-type-update.dto';
import { DictItemCreateDto } from './dto/dict-item-create.dto';
import { DictItemUpdateDto } from './dto/dict-item-update.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AuthUser } from '../../auth/auth.service';

@Controller('dict')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DictController {
  constructor(private readonly dictService: DictService) {}

  private operatorId(req: Request): string | null {
    return (req.user as AuthUser)?.id ?? null;
  }

  // ---------------- Dict Types ----------------
  @Get('types')
  @Permissions('SEARCH')
  listTypes() {
    return this.dictService.listTypes();
  }

  @Get('types/:code')
  @Permissions('SEARCH')
  getType(@Param('code') code: string) {
    return this.dictService.getType(code);
  }

  @Post('types')
  @Permissions('ADD')
  createType(@Body() dto: DictTypeCreateDto, @Req() req: Request) {
    return this.dictService.createType(dto, this.operatorId(req));
  }

  @Put('types/:code')
  @Permissions('EDIT')
  updateType(
    @Param('code') code: string,
    @Body() dto: DictTypeUpdateDto,
    @Req() req: Request,
  ) {
    return this.dictService.updateType(code, dto, this.operatorId(req));
  }

  @Delete('types/:code')
  @Permissions('DELETE')
  deleteType(@Param('code') code: string, @Req() req: Request) {
    return this.dictService.deleteType(code, this.operatorId(req));
  }

  // ---------------- Dict Items ----------------
  @Get('types/:code/items')
  @Permissions('SEARCH')
  listItems(@Param('code') code: string) {
    return this.dictService.listItems(code);
  }

  @Post('types/:code/items')
  @Permissions('ADD')
  createItem(
    @Param('code') code: string,
    @Body() dto: DictItemCreateDto,
    @Req() req: Request,
  ) {
    return this.dictService.createItem(code, dto, this.operatorId(req));
  }

  @Put('items/:id')
  @Permissions('EDIT')
  updateItem(
    @Param('id') id: string,
    @Body() dto: DictItemUpdateDto,
    @Req() req: Request,
  ) {
    return this.dictService.updateItem(id, dto, this.operatorId(req));
  }

  @Delete('items/:id')
  @Permissions('DELETE')
  deleteItem(@Param('id') id: string, @Req() req: Request) {
    return this.dictService.deleteItem(id, this.operatorId(req));
  }
}
