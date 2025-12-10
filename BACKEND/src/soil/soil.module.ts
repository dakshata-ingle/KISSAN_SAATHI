// BACKEND/src/soil/soil.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SoilService } from './soil.service';
import { SoilController } from './soil.controller';

@Module({
  imports: [HttpModule],
  providers: [SoilService],
  controllers: [SoilController],
  exports: [SoilService],
})
export class SoilModule {}
