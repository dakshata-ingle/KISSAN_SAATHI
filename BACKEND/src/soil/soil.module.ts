// src/soil/soil.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SoilController } from './soil.controller';
import { SoilService } from './soil.service';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [HttpModule, GeocodingModule],
  controllers: [SoilController],
  providers: [SoilService],
})
export class SoilModule {}
