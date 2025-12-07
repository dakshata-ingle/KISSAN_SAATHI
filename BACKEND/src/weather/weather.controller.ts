// src/weather/weather.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { GetWeatherQueryDto } from './get-weather-query.dto';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getWeather(@Query() query: GetWeatherQueryDto) {
    // ✅ Let the service handle:
    // - city/state/country/village → lat/lon (via GeocodingService)
    // - OR lat/lon directly
    return this.weatherService.getWeather(query);
  }
}
