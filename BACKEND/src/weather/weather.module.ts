// src/weather/weather.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { GeocodingService } from '../geocoding/geocoding.service';

@Module({
  imports: [
    HttpModule,        // needed because WeatherService injects HttpService
  ],
  controllers: [WeatherController],
  providers: [
    WeatherService,
    GeocodingService,  // 👈 make GeocodingService available in WeatherModule
  ],
  exports: [WeatherService],
})
export class WeatherModule {}
