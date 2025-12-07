// BACKEND/src/weather/weather.controller.ts
import { Body, Controller, Post, BadRequestException, Get } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { AreaWeatherDto } from './dto/area-weather.dto';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  /**
   * POST /weather/area
   * Body: { latitude, longitude } OR { polygon: GeoJSON Polygon } (WGS84; coordinates [lon, lat])
   * This is used by your frontend / API clients
   */
  @Post('area')
  async getWeatherForArea(@Body() body: AreaWeatherDto) {
    const { latitude, longitude, polygon } = body;
    if ((!latitude || !longitude) && !polygon) {
      throw new BadRequestException('Provide either latitude+longitude or polygon (GeoJSON).');
    }
    return this.weatherService.getWeatherForArea(body);
  }

  /**
   * GET /weather/test
   * Simple test endpoint so you can see JSON directly in browser
   * Uses fixed coordinates (Jaipur) for testing.
   */
  @Get('test')
  async getTestWeather() {
    const body: AreaWeatherDto = {
      latitude: 26.9124,
      longitude: 75.7873,
      polygon: undefined,
    };

    const data = await this.weatherService.getWeatherForArea(body);

    // To keep it small & readable in browser, only return daily7 part
    return data.daily7 ?? data;
  }
}
