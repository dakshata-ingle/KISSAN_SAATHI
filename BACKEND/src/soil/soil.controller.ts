// src/soil/soil.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as turf from '@turf/turf';
import { SoilService } from './soil.service';
import { SoilHealthResponseDto } from './dto/soil-health-response.dto';

@Controller('soil')
export class SoilController {
  constructor(private readonly soilService: SoilService) {}

  /**
   * GET /soil?lat=..&lon=..
   * Returns SoilHealthResponseDto (may be partial; optional fields handled)
   */
  @Get()
  async getSoilByCoords(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
  ): Promise<SoilHealthResponseDto> {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestException('lat and lon query parameters are required and must be numbers');
    }

    try {
      // service returns a flexible object that matches SoilHealthResponseDto shape (or subset)
      const raw = await this.soilService.getSoilAnalysisByCoords(lat, lon);
      // Cast to DTO (we made DTO flexible/optional so this is safe)
      return raw as SoilHealthResponseDto;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err?.message || 'Failed to fetch soil data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /soil/area
   * Accepts { polygon: <GeoJSON Polygon> } and computes centroid to reuse point API.
   */
  @Post('area')
  async getSoilForArea(
    @Body() body: { polygon: any },
  ): Promise<SoilHealthResponseDto> {
    if (!body || !body.polygon) {
      throw new BadRequestException('Request body must include `polygon` (GeoJSON)');
    }

    try {
      // compute centroid (lon, lat)
      const centroid = turf.centroid(body.polygon);
      const coords = centroid.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        throw new BadRequestException('Invalid polygon provided (failed to compute centroid)');
      }
      const [lon, lat] = coords;
      const raw = await this.soilService.getSoilAnalysisByCoords(lat, lon);
      return raw as SoilHealthResponseDto;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err?.message || 'Failed to process polygon', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /soil/assess
   * Accepts: { area: <GeoJSON Polygon | Point>, requestedDepthCm?: number, cropType?: string }
   * Returns: job descriptor (demo service returns synchronous result object).
   */
  @Post('assess')
  async createAssessment(@Body() payload: any) {
    if (!payload || !payload.area) {
      throw new BadRequestException('Request body must include `area` (GeoJSON Polygon or Point)');
    }

    try {
      // createAssessment returns { jobId, status, result } in demo service
      const job = await this.soilService.createAssessment(payload);
      return job;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err?.message || 'Failed to create assessment', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /soil/assess/:jobId
   * Returns job state/result (from in-memory store or DB)
   */
  @Get('assess/:jobId')
  async getAssessment(@Param('jobId') jobId: string) {
    if (!jobId) {
      throw new BadRequestException('jobId path parameter is required');
    }

    try {
      const job = await this.soilService.getAssessment(jobId);
      return job;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err?.message || 'Failed to fetch assessment', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
