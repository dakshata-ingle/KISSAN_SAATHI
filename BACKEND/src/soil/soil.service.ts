// src/soil/soil.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';

// ---- Types defined locally so NO imports from ./interfaces ----
type NutrientLevel = 'low' | 'medium' | 'high';

interface DonutBreakdown {
  low: number;
  medium: number;
  high: number;
  currentLevel: NutrientLevel;
}

interface DepthValue {
  depthCm: number;
  value: number;
}

interface TimeSeriesByDepth {
  dates: string[];
  series: Record<string, number[]>;
}

export interface SoilAnalysisResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };

  current: {
    temperatureByDepth: DepthValue[];
    moistureByDepth: DepthValue[];
    healthOverview: {
      nitrogen: DonutBreakdown;
      phosphorus: DonutBreakdown;
      potassium: DonutBreakdown;
      zinc: DonutBreakdown;
    };
  };

  forecast7d: {
    temperature: TimeSeriesByDepth;
    moisture: TimeSeriesByDepth;
  };

  history30d: {
    temperature: TimeSeriesByDepth;
    moisture: TimeSeriesByDepth;
  };
}

// -------------------------------------------------------
// UPDATED: SoilQueryParams now supports country/state/city/village
// -------------------------------------------------------
interface SoilQueryParams {
  country?: string;
  state?: string;
  city?: string;
  village?: string;
  lat?: number;
  lon?: number;
}

// -------------------------------------------------------

@Injectable()
export class SoilService {
  constructor(
    private readonly http: HttpService,
    private readonly geocodingService: GeocodingService,
  ) {}

  // -------------------------------------------------------
  // MAIN ENTRY: Fetch final soil analysis
  // -------------------------------------------------------
  async getSoilAnalysis(params: SoilQueryParams): Promise<SoilAnalysisResponse> {
    const { lat, lon, resolvedName } = await this.resolveLocation(params);

    const url = 'https://api.open-meteo.com/v1/forecast';

    const hourlyVariables = [
      'soil_temperature_0cm',
      'soil_temperature_6cm',
      'soil_temperature_18cm',
      'soil_temperature_54cm',
      'soil_moisture_0_1cm',
      'soil_moisture_1_3cm',
      'soil_moisture_3_9cm',
      'soil_moisture_9_27cm',
      'soil_moisture_27_81cm',
    ].join(',');

    const { data } = await firstValueFrom(
      this.http.get(url, {
        params: {
          latitude: lat,
          longitude: lon,
          hourly: hourlyVariables,
          timezone: 'auto',
          forecast_days: 7,
          past_days: 30,
        },
      }),
    );

    const timezone: string = data.timezone;
    const times: string[] = data.hourly.time;

    const lastIndex = times.length - 1;

    const temperatureByDepth: DepthValue[] = [
      { depthCm: 0, value: data.hourly.soil_temperature_0cm[lastIndex] },
      { depthCm: 6, value: data.hourly.soil_temperature_6cm[lastIndex] },
      { depthCm: 18, value: data.hourly.soil_temperature_18cm[lastIndex] },
      { depthCm: 54, value: data.hourly.soil_temperature_54cm[lastIndex] },
    ];

    const moistureByDepth: DepthValue[] = [
      { depthCm: 0, value: data.hourly.soil_moisture_0_1cm[lastIndex] * 100 },
      { depthCm: 2, value: data.hourly.soil_moisture_1_3cm[lastIndex] * 100 },
      { depthCm: 6, value: data.hourly.soil_moisture_3_9cm[lastIndex] * 100 },
      { depthCm: 18, value: data.hourly.soil_moisture_9_27cm[lastIndex] * 100 },
      { depthCm: 48, value: data.hourly.soil_moisture_27_81cm[lastIndex] * 100 },
    ];

    const healthOverview = this.deriveSoilHealth(temperatureByDepth, moistureByDepth);

    const forecast7dTemp = this.buildDailySeries(
      times,
      {
        '0cm': data.hourly.soil_temperature_0cm,
        '6cm': data.hourly.soil_temperature_6cm,
        '18cm': data.hourly.soil_temperature_18cm,
        '54cm': data.hourly.soil_temperature_54cm,
      },
      7,
      false,
    );

    const forecast7dMoist = this.buildDailySeries(
      times,
      {
        '0cm': data.hourly.soil_moisture_0_1cm.map((v: number) => v * 100),
        '2cm': data.hourly.soil_moisture_1_3cm.map((v: number) => v * 100),
        '6cm': data.hourly.soil_moisture_3_9cm.map((v: number) => v * 100),
        '18cm': data.hourly.soil_moisture_9_27cm.map((v: number) => v * 100),
        '48cm': data.hourly.soil_moisture_27_81cm.map((v: number) => v * 100),
      },
      7,
      false,
    );

    const history30dTemp = this.buildDailySeries(
      times,
      {
        '0cm': data.hourly.soil_temperature_0cm,
        '6cm': data.hourly.soil_temperature_6cm,
        '18cm': data.hourly.soil_temperature_18cm,
        '54cm': data.hourly.soil_temperature_54cm,
      },
      30,
      true,
    );

    const history30dMoist = this.buildDailySeries(
      times,
      {
        '0cm': data.hourly.soil_moisture_0_1cm.map((v: number) => v * 100),
        '2cm': data.hourly.soil_moisture_1_3cm.map((v: number) => v * 100),
        '6cm': data.hourly.soil_moisture_3_9cm.map((v: number) => v * 100),
        '18cm': data.hourly.soil_moisture_9_27cm.map((v: number) => v * 100),
        '48cm': data.hourly.soil_moisture_27_81cm.map((v: number) => v * 100),
      },
      30,
      true,
    );

    return {
      location: {
        name: resolvedName,
        latitude: lat,
        longitude: lon,
        timezone,
      },
      current: {
        temperatureByDepth,
        moistureByDepth,
        healthOverview,
      },
      forecast7d: {
        temperature: forecast7dTemp,
        moisture: forecast7dMoist,
      },
      history30d: {
        temperature: history30dTemp,
        moisture: history30dMoist,
      },
    };
  }

  // -------------------------------------------------------
  // UPDATED: New multi-field location resolution logic
  // -------------------------------------------------------
  private async resolveLocation(params: SoilQueryParams) {
    const { country, state, city, village, lat, lon } = params;

    // 1️⃣ If at least one text location is present → use geocoding
    if (country || state || city || village) {
      const parts = [village, city, state, country].filter(Boolean);
      const locationQuery = parts.join(', ');

      const { latitude, longitude, displayName } =
        await this.geocodingService.geocodeCity(locationQuery);

      return { lat: latitude, lon: longitude, resolvedName: displayName };
    }

    // 2️⃣ Otherwise fallback to lat/lon → required in this case
    if (lat == null || lon == null) {
      throw new BadRequestException(
        'Provide either country/state/city/village or lat/lon',
      );
    }

    return {
      lat,
      lon,
      resolvedName: `${lat}, ${lon}`,
    };
  }

  // -------------------------------------------------------

  private buildDailySeries(
    times: string[],
    seriesByDepth: Record<string, number[]>,
    numDays: number,
    usePast: boolean,
  ): TimeSeriesByDepth {
    const dates = times.map((t) => t.slice(0, 10));

    const uniqueDates: string[] = [];
    for (const d of dates) {
      if (uniqueDates[uniqueDates.length - 1] !== d) {
        uniqueDates.push(d);
      }
    }

    const selectedDates = usePast
      ? uniqueDates.slice(-numDays - 1, -1)
      : uniqueDates.slice(-numDays);

    const resultSeries: Record<string, number[]> = {};
    Object.keys(seriesByDepth).forEach((k) => (resultSeries[k] = []));

    for (const day of selectedDates) {
      const idxs: number[] = [];
      dates.forEach((d, i) => {
        if (d === day) idxs.push(i);
      });

      Object.entries(seriesByDepth).forEach(([key, values]) => {
        const mean =
          idxs.reduce((sum, i) => sum + values[i], 0) / (idxs.length || 1);
        resultSeries[key].push(Number(mean.toFixed(2)));
      });
    }

    return {
      dates: selectedDates,
      series: resultSeries,
    };
  }

  private deriveSoilHealth(
    temps: DepthValue[],
    moistures: DepthValue[],
  ): SoilAnalysisResponse['current']['healthOverview'] {
    const surfaceTemp = temps.find((t) => t.depthCm === 0)?.value ?? 25;
    const rootMoist =
      moistures.find((m) => m.depthCm === 18)?.value ??
      moistures[moistures.length - 1]?.value ??
      60;

    const moistureScore = Math.min(100, Math.max(0, rootMoist));
    const tempScore = Math.min(100, Math.max(0, (30 - Math.abs(surfaceTemp - 25)) * 4));

    const baseScore = (moistureScore * 0.6 + tempScore * 0.4) / 100;

    const makeDonut = (factor: number): DonutBreakdown => {
      const score = Math.max(0, Math.min(1, baseScore * factor));

      let currentLevel: NutrientLevel;
      if (score < 0.33) currentLevel = 'low';
      else if (score < 0.66) currentLevel = 'medium';
      else currentLevel = 'high';

      const high = Math.round(score * 40 + 20);
      const medium = Math.round(60 - high / 2);
      const low = 100 - (high + medium);

      return { low, medium, high, currentLevel };
    };

    return {
      nitrogen: makeDonut(1.0),
      phosphorus: makeDonut(0.9),
      potassium: makeDonut(1.1),
      zinc: makeDonut(0.8),
    };
  }
}
