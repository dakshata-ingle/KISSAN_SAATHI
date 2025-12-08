// src/soil/soil.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';

// 👉 IMPORT YOUR RESPONSE DTO
import {
  SoilHealthResponseDto,
  SoilLayerDto,
  SoilLayerStatus,
  NutrientDto,
  NutrientStatus,
  ActionStepDto,
  MapLayersDto,
} from './dto/soil-health-response.dto';

// ---- Internal helper types (service ke andar hi use honge) ----
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

// -------------------------------------------------------
// SoilQueryParams supports country/state/city/village OR lat/lon
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
  // Helper for lat/lon directly (used by /soil-health?lat=&lon=)
  // -------------------------------------------------------
  async getSoilAnalysisByCoords(
    lat: number,
    lon: number,
  ): Promise<SoilHealthResponseDto> {
    return this.getSoilAnalysis({ lat, lon });
  }

  // -------------------------------------------------------
  // MAIN ENTRY: returns SoilHealthResponseDto (PM format)
  // -------------------------------------------------------
  async getSoilAnalysis(
    params: SoilQueryParams,
  ): Promise<SoilHealthResponseDto> {
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

    // Current depth-wise values
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

    // Nutrient donut-style health
    const healthOverview = this.deriveSoilHealth(
      temperatureByDepth,
      moistureByDepth,
    );

    // 👉 1) Build thermogram array (SoilLayerDto[])
    const thermogram: SoilLayerDto[] = this.buildThermogram(
      temperatureByDepth,
      moistureByDepth,
    );

    // 👉 2) Map donut health to NutrientDto[]
    const nutrients: NutrientDto[] = this.buildNutrientsFromHealth(
      healthOverview,
    );

    // 👉 3) Build basic action plan based on health
    const actionPlan: ActionStepDto[] = this.buildActionPlan(
      healthOverview,
      timezone,
    );

    // 👉 4) Map layers (abhi ke liye placeholders, baad me NDVI etc. plug karoge)
    const mapLayers: MapLayersDto = {
      ndviTileUrl: undefined,
      moistureTileUrl: undefined,
      pMapTileUrl: undefined,
      kMapTileUrl: undefined,
      vraGeoJson: null,
    };

    const response: SoilHealthResponseDto = {
      location: {
        name: resolvedName,
        latitude: lat,
        longitude: lon,
      },
      thermogram,
      nutrients,
      actionPlan,
      mapLayers,
      updatedAt: new Date().toISOString(),
    };

    return response;
  }

  // -------------------------------------------------------
  // Location resolution logic
  // -------------------------------------------------------
  private async resolveLocation(params: SoilQueryParams) {
    const { country, state, city, village, lat, lon } = params;

    if (country || state || city || village) {
      const parts = [village, city, state, country].filter(Boolean);
      const locationQuery = parts.join(', ');

      const { latitude, longitude, displayName } =
        await this.geocodingService.geocodeCity(locationQuery);

      return { lat: latitude, lon: longitude, resolvedName: displayName };
    }

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
  // Thermogram builder – converts depths into SoilLayerDto[]
  // -------------------------------------------------------
  private buildThermogram(
    temps: DepthValue[],
    moistures: DepthValue[],
  ): SoilLayerDto[] {
    const findMoist = (depthCm: number) =>
      moistures.find((m) => m.depthCm === depthCm)?.value ?? null;

    const depthLabels: Record<number, string> = {
      0: '0–1 cm',
      2: '1–3 cm',
      6: '3–9 cm',
      18: '9–27 cm',
      48: '27–81 cm',
    };

    const layers: SoilLayerDto[] = temps.map((t) => {
      const moisture = findMoist(t.depthCm);
      const status = this.getLayerStatus(t.value, moisture);

      return {
        depthLabel: depthLabels[t.depthCm] ?? `${t.depthCm} cm`,
        temperature: t.value,
        moisture,
        status,
      };
    });

    // Add moisture-only depth 48cm if not already included
    if (!layers.find((l) => l.depthLabel === depthLabels[48])) {
      const m48 = moistures.find((m) => m.depthCm === 48);
      if (m48) {
        layers.push({
          depthLabel: depthLabels[48],
          temperature: null,
          moisture: m48.value,
          status: this.getLayerStatus(null, m48.value),
        });
      }
    }

    return layers;
  }

  private getLayerStatus(
    temperature: number | null,
    moisture: number | null,
  ): SoilLayerStatus {
    // Simple heuristic: sirf rough visualization ke liye
    if (moisture == null && temperature == null) return 'BLUE';

    const moist = moisture ?? 50;
    const temp = temperature ?? 25;

    if (moist >= 40 && moist <= 80 && temp >= 18 && temp <= 32) return 'GREEN';
    if (moist >= 25 && moist < 40) return 'GOLD';
    if (moist < 25) return 'RED';
    return 'BLUE';
  }

  // -------------------------------------------------------
  // Nutrient health: same logic as pehle, but internal
  // -------------------------------------------------------
  private deriveSoilHealth(
    temps: DepthValue[],
    moistures: DepthValue[],
  ): {
    nitrogen: DonutBreakdown;
    phosphorus: DonutBreakdown;
    potassium: DonutBreakdown;
    zinc: DonutBreakdown;
  } {
    const surfaceTemp = temps.find((t) => t.depthCm === 0)?.value ?? 25;
    const rootMoist =
      moistures.find((m) => m.depthCm === 18)?.value ??
      moistures[moistures.length - 1]?.value ??
      60;

    const moistureScore = Math.min(100, Math.max(0, rootMoist));
    const tempScore = Math.min(
      100,
      Math.max(0, (30 - Math.abs(surfaceTemp - 25)) * 4),
    );

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

  // -------------------------------------------------------
  // Convert donut health → NutrientDto[] (for UI)
  // -------------------------------------------------------
  private buildNutrientsFromHealth(
    overview: ReturnType<typeof this.deriveSoilHealth>,
  ): NutrientDto[] {
    const mapLevelToStatus = (level: NutrientLevel): NutrientStatus => {
      if (level === 'low') return 'DEFICIENT';
      if (level === 'medium') return 'MONITOR';
      return 'GOOD';
    };

    return [
      {
        code: 'N',
        name: 'Nitrogen',
        value: null,
        unit: 'kg/ha',
        percentOfOptimal: overview.nitrogen.high,
        status: mapLevelToStatus(overview.nitrogen.currentLevel),
      },
      {
        code: 'P',
        name: 'Phosphorus',
        value: null,
        unit: 'kg/ha',
        percentOfOptimal: overview.phosphorus.high,
        status: mapLevelToStatus(overview.phosphorus.currentLevel),
      },
      {
        code: 'K',
        name: 'Potassium',
        value: null,
        unit: 'kg/ha',
        percentOfOptimal: overview.potassium.high,
        status: mapLevelToStatus(overview.potassium.currentLevel),
      },
      {
        code: 'ZN',
        name: 'Zinc',
        value: null,
        unit: 'ppm',
        percentOfOptimal: overview.zinc.high,
        status: mapLevelToStatus(overview.zinc.currentLevel),
      },
    ];
  }

  // -------------------------------------------------------
  // Simple rule-based action plan
  // -------------------------------------------------------
  private buildActionPlan(
    overview: ReturnType<typeof this.deriveSoilHealth>,
    timezone: string,
  ): ActionStepDto[] {
    const steps: ActionStepDto[] = [];
    const now = new Date().toLocaleString('en-IN', { timeZone: timezone });

    const anyDeficient =
      overview.nitrogen.currentLevel === 'low' ||
      overview.phosphorus.currentLevel === 'low' ||
      overview.potassium.currentLevel === 'low' ||
      overview.zinc.currentLevel === 'low';

    if (anyDeficient) {
      steps.push({
        id: 'nutrient-correction',
        priority: 1,
        title: 'Nutrient imbalance detected',
        description:
          'Apply recommended NPK and micronutrient dose in split applications. Avoid over-irrigation after fertilizer use.',
        category: 'NUTRIENT',
        zoneId: 'Field',
      });
    }

    steps.push({
      id: 'moisture-management',
      priority: 2,
      title: 'Manage soil moisture',
      description:
        'Maintain light, frequent irrigation to keep root-zone moisture between 40–70%. Avoid waterlogging and deep cracks.',
      category: 'MOISTURE',
    });

    steps.push({
      id: 'monitor-next-7-days',
      priority: 3,
      title: 'Monitor soil condition',
      description: `Re-check soil status and satellite indices in the next 7 days. Last analysis time: ${now}.`,
      category: 'GENERAL',
    });

    return steps;
  }

  // -------------------------------------------------------
  // (Optional) You can still keep buildDailySeries if needed later
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
}
