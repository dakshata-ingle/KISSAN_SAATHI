// src/soil/soil.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SoilController } from './soil.controller';
import { SoilService } from './soil.service';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [
    HttpModule,        // required for Open-Meteo soil API calls
    GeocodingModule,   // required because SoilService injects GeocodingService
  ],
  controllers: [SoilController],
  providers: [SoilService],
  exports: [SoilService],
})
export class SoilModule {}
