import { Module } from '@nestjs/common';
import { KraftService } from './kraft.service';
import { KraftController } from './kraft.controller';

@Module({
  controllers: [KraftController],
  providers: [KraftService],
  exports: [KraftService],
})
export class KraftModule {}
