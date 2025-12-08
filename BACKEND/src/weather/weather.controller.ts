// BACKEND/src/weather/weather.controller.ts
import {
  Body,
  Controller,
  Post,
  BadRequestException,
  Get,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { WeatherService } from './weather.service';
import { AreaWeatherDto } from './dto/area-weather.dto';
import { from, map, Observable } from 'rxjs';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  /**
   * POST /weather/area
   * Body: { latitude, longitude } OR { polygon: GeoJSON Polygon }
   */
  @Post('area')
  async getWeatherForArea(@Body() body: AreaWeatherDto) {
    const { latitude, longitude, polygon } = body;
    if ((!latitude || !longitude) && !polygon) {
      throw new BadRequestException(
        'Provide either latitude+longitude or polygon (GeoJSON).',
      );
    }
    return this.weatherService.getWeatherForArea(body);
  }

  /**
   * GET /weather?lat=..&lon=..
   * Used by the Next.js frontend.
   */
  @Get()
  async getPointWeather(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('timezone') tz?: string,
  ) {
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('lat and lon query parameters are required');
    }

    const result = await this.weatherService.getWeatherForArea({
      latitude,
      longitude,
      timezone: tz,
    });

    return this.buildFrontendResponse(latitude, longitude, result);
  }

  /**
   * SSE: GET /weather/stream?lat=..&lon=..
   * Frontend uses this when "Realtime" toggle is ON.
   */
  @Sse('stream')
  streamWeather(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('timezone') tz?: string,
  ): Observable<MessageEvent> {
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('lat and lon query parameters are required');
    }

    return from(
      this.weatherService.getWeatherForArea({
        latitude,
        longitude,
        timezone: tz,
      }),
    ).pipe(
      map((result) => ({
        data: this.buildFrontendResponse(latitude, longitude, result),
      })),
    );
  }

  /**
   * GET /weather/test
   * Quick manual test.
   */
  @Get('test')
  async getTestWeather() {
    const body: AreaWeatherDto = {
      latitude: 26.9124,
      longitude: 75.7873,
      polygon: undefined,
    };

    const data = await this.weatherService.getWeatherForArea(body);
    return this.buildFrontendResponse( Number(body.latitude),
  Number(body.longitude),
  data
);
  }

  /**
   * ---- Helper: build response for frontend WeatherAnalysisResponse ----
   */
  private buildFrontendResponse(
    latitude: number,
    longitude: number,
    result: any,
  ) {
    // For point query: { type: 'point', location, data }
    const data = result.data ?? result ?? {};

    const currentRaw = data.current ?? {};
    const forecast7 = data.forecast7 ?? {};
    const forecastDaily = forecast7.daily ?? {};
    const forecastHourly = forecast7.hourly ?? {};

    const dailyRange = data.dailyRange ?? {};
    const history30 = data.history30 ?? {};
    const historyHourly = history30.hourly ?? {};

    const timezone =
      data.metadata?.timezone ??
      data.timezone ??
      forecast7.timezone ??
      'UTC';

    // ---- CURRENT ----
    const current = {
      temperature:
        typeof currentRaw.temperature_2m === 'number'
          ? currentRaw.temperature_2m
          : null,
      humidity:
        typeof currentRaw.humidity === 'number'
          ? currentRaw.humidity
          : typeof currentRaw.relative_humidity_2m === 'number'
          ? currentRaw.relative_humidity_2m
          : typeof currentRaw.relativehumidity_2m === 'number'
          ? currentRaw.relativehumidity_2m
          : null,
      rain:
        typeof currentRaw.rain === 'number'
          ? currentRaw.rain
          : typeof currentRaw.precipitation === 'number'
          ? currentRaw.precipitation
          : null,
      windSpeed:
        typeof currentRaw.windspeed_10m === 'number'
          ? currentRaw.windspeed_10m
          : null,
      precipitation:
        typeof currentRaw.precipitation === 'number'
          ? currentRaw.precipitation
          : null,
      summary: '', // optional human-readable text later
      lastUpdated: currentRaw.time ?? undefined,
    };

    // ---- DAILY HUMIDITY (from hourly) ----
    const forecastHumiditySeries = this.buildDailyHumiditySeries(
      forecastDaily.time ?? [],
      forecastHourly,
    );

    const historyHumiditySeries = this.buildDailyHumiditySeries(
      dailyRange.time ?? [],
      historyHourly,
    );

    // ---- 7-DAY FORECAST ----
    const forecast7d = {
      temperature: (forecastDaily.time ?? []).map((date: string, i: number) => ({
        date,
        min: forecastDaily.temperature_2m_min?.[i] ?? null,
        max: forecastDaily.temperature_2m_max?.[i] ?? null,
      })),
      precipitation: {
        dates: forecastDaily.time ?? [],
        values: forecastDaily.precipitation_sum ?? [],
      },
      humidity: forecastHumiditySeries ?? undefined,
    };

    // ---- 30-DAY HISTORY ----
    const history30d = {
      temperature: (dailyRange.time ?? []).map((date: string, i: number) => ({
        date,
        min: dailyRange.temperature_2m_min?.[i] ?? null,
        max: dailyRange.temperature_2m_max?.[i] ?? null,
      })),
      precipitation: {
        dates: dailyRange.time ?? [],
        values: dailyRange.precipitation_sum ?? [],
      },
      humidity: historyHumiditySeries ?? undefined,
    };

    return {
      location: {
        name: 'Selected location',
        latitude,
        longitude,
        timezone,
      },
      current,
      forecast7d,
      history30d,
    };
  }

  /**
   * Build a daily humidity series (avg per day) from hourly data.
   * dailyDates: e.g. ["2025-12-08", "2025-12-09", ...]
   * hourly: { time: [...], relative_humidity_2m: [...] }
   */
  private buildDailyHumiditySeries(
  dailyDates: string[],
  hourly: any,
):
  | {
      dates: string[];
      values: (number | null)[];
    }
  | null {
  if (!hourly || !hourly.time) {
    return null;
  }

  // ✅ Accept BOTH possible field names from hourly data
  const valuesRaw =
    hourly.relative_humidity_2m ?? hourly.relativehumidity_2m ?? null;

  if (!valuesRaw) {
    return null;
  }

  const times: string[] = hourly.time;
  const values: any[] = valuesRaw;

  // Aggregate hourly → daily avg
  const agg: Record<string, { sum: number; count: number }> = {};

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const v = values[i];
    if (typeof v !== "number") continue;

    const day = t.slice(0, 10); // "YYYY-MM-DD"
    if (!agg[day]) agg[day] = { sum: 0, count: 0 };
    agg[day].sum += v;
    agg[day].count += 1;
  }

  const outDates: string[] = [];
  const outValues: (number | null)[] = [];

  for (const d of dailyDates) {
    outDates.push(d);
    if (agg[d] && agg[d].count > 0) {
      outValues.push(agg[d].sum / agg[d].count);
    } else {
      outValues.push(null);
    }
  }

  return { dates: outDates, values: outValues };
}
}
