// src/soil/soil.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SoilService } from './soil.service';
import { GetSoilAnalysisDto } from './get-soil-analysis.dto';

@Controller('soil')
export class SoilController {
  constructor(private readonly soilService: SoilService) {}

  @Get() // change to @Get('analysis') if your route was /soil/analysis earlier
  async getSoilAnalysis(@Query() query: GetSoilAnalysisDto) {
    return this.soilService.getSoilAnalysis(query);
  }
}
