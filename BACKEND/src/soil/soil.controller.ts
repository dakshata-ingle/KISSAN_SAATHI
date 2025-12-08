// src/soil/soil.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { SoilService } from './soil.service';
import * as turf from '@turf/turf';

// 👉 NEW: import the response DTO that PM wants
import { SoilHealthResponseDto } from './dto/soil-health-response.dto';
// agar file dto folder me hai to:
// import { SoilHealthResponseDto } from './dto/soil-health.response.dto';

@Controller('soil')
export class SoilController {
  constructor(private readonly soilService: SoilService) {}

  /**
   * GET /soil?lat=..&lon=..
   * Current soil data using point location (same as Weather)
   * Returns SoilHealthResponseDto (PM format)
   */
  @Get()
  async getSoilByCoords(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
  ): Promise<SoilHealthResponseDto> {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestException('lat and lon query parameters are required');
    }

    // 👉 Service ab SoilHealthResponseDto return karega
    return this.soilService.getSoilAnalysisByCoords(lat, lon);
  }

  /**
   * POST /soil/area
   * Polygon-based soil selection:
   *  - polygon se centroid nikalte hain
   *  - same soil analysis logic reuse karte hain
   */
  @Post('area')
  async getSoilForArea(
    @Body() body: { polygon: any },
  ): Promise<SoilHealthResponseDto> {
    if (!body.polygon) {
      throw new BadRequestException('Polygon is required');
    }

    // Compute centroid of polygon [lon, lat]
    const centroid = turf.centroid(body.polygon);
    const [lon, lat] = centroid.geometry.coordinates;

    // Reuse current soil logic (returns SoilHealthResponseDto)
    return this.soilService.getSoilAnalysisByCoords(lat, lon);
  }
}
