import { Module } from '@nestjs/common';
import { DictController } from './dict.controller';
import { DictService } from './dict.service';

@Module({
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
