import { Module } from '@nestjs/common';
import { DuplexService } from './duplex.service';
import { DuplexController } from './duplex.controller';

@Module({
  controllers: [DuplexController],
  providers: [DuplexService],
  exports: [DuplexService],
})
export class DuplexModule {}
