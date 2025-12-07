// src/weather/weather.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';
import { GetWeatherQueryDto } from './get-weather-query.dto';

// ---------- Local Types (no external imports) ----------

interface WeatherCurrent {
  temperature: number;      // °C
  humidity: number;         // %
  windSpeed: number;        // m/s
  precipitation: number;    // mm
  summary: string;
}

interface DailyRange {
  date: string;
  min: number;
  max: number;
}

interface DailySeries {
  dates: string[];
  values: number[];
}

export interface WeatherAnalysisResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: WeatherCurrent;
  forecast7d: {
    temperature: DailyRange[];      // next 7 days
    precipitation: DailySeries;     // next 7 days
  };
  history30d: {
    temperature: DailyRange[];      // last 30 days
    precipitation: DailySeries;     // last 30 days
  };
}

// Query type used internally (same fields as DTO)
interface WeatherLocationParams {
  country?: string;
  state?: string;
  city?: string;
  village?: string;
  lat?: number;
  lon?: number;
}

@Injectable()
export class WeatherService {
  constructor(
    private readonly http: HttpService,
    private readonly geocodingService: GeocodingService,
  ) {}

  // -------------------------------------------------------
  // PUBLIC: Main entry for controller
  // -------------------------------------------------------
  async getWeather(query: GetWeatherQueryDto): Promise<WeatherAnalysisResponse> {
    // 1️⃣ Resolve lat/lon + human-readable name
    const { lat, lon, resolvedName } = await this.resolveLocation(query);

    // 2️⃣ Call Open-Meteo weather API (current + 7d + 30d)
    const url = 'https://api.open-meteo.com/v1/forecast';

    const { data } = await firstValueFrom(
      this.http.get(url, {
        params: {
          latitude: lat,
          longitude: lon,
          timezone: 'auto',
          // current
          current:
            'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
          // daily for forecast and history
          daily:
            'temperature_2m_max,temperature_2m_min,precipitation_sum',
          forecast_days: 7,
          past_days: 30,
        },
      }),
    );

    const timezone: string = data.timezone;

    // ---------- CURRENT ----------
    const current: WeatherCurrent = {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      precipitation: data.current.precipitation,
      summary: this.buildSummary(
        data.current.temperature_2m,
        data.current.relative_humidity_2m,
        data.current.wind_speed_10m,
      ),
    };

    // ---------- DAILY ARRAYS ----------
    const dailyDates: string[] = data.daily.time; // already YYYY-MM-DD
    const dailyMaxTemp: number[] = data.daily.temperature_2m_max;
    const dailyMinTemp: number[] = data.daily.temperature_2m_min;
    const dailyPrecip: number[] = data.daily.precipitation_sum;

    // Open-Meteo returns past + future days together when past_days is used.
    // We requested past_days=30 and forecast_days=7 → total 37 days.
    //
    // We'll split into:
    // - history30d: first 30 entries
    // - forecast7d: last 7 entries

    const totalDays = dailyDates.length;
    if (totalDays < 37) {
      // Safety check: if API returns fewer days than expected
      // we try a best-effort split at the end.
      throw new BadRequestException(
        `Unexpected Open-Meteo daily length: got ${totalDays}, expected >= 37`,
      );
    }

    const historyCount = 30;
    const forecastCount = 7;

    const historyDates = dailyDates.slice(0, historyCount);
    const historyMaxTemp = dailyMaxTemp.slice(0, historyCount);
    const historyMinTemp = dailyMinTemp.slice(0, historyCount);
    const historyPrecip = dailyPrecip.slice(0, historyCount);

    const forecastDates = dailyDates.slice(-forecastCount);
    const forecastMaxTemp = dailyMaxTemp.slice(-forecastCount);
    const forecastMinTemp = dailyMinTemp.slice(-forecastCount);
    const forecastPrecip = dailyPrecip.slice(-forecastCount);

    const forecast7dTemp: DailyRange[] = forecastDates.map((d, idx) => ({
      date: d,
      min: forecastMinTemp[idx],
      max: forecastMaxTemp[idx],
    }));

    const forecast7dPrecip: DailySeries = {
      dates: forecastDates,
      values: forecastPrecip,
    };

    const history30dTemp: DailyRange[] = historyDates.map((d, idx) => ({
      date: d,
      min: historyMinTemp[idx],
      max: historyMaxTemp[idx],
    }));

    const history30dPrecip: DailySeries = {
      dates: historyDates,
      values: historyPrecip,
    };

    // ---------- FINAL SHAPE ----------
    return {
      location: {
        name: resolvedName,
        latitude: lat,
        longitude: lon,
        timezone,
      },
      current,
      forecast7d: {
        temperature: forecast7dTemp,
        precipitation: forecast7dPrecip,
      },
      history30d: {
        temperature: history30dTemp,
        precipitation: history30dPrecip,
      },
    };
  }

  // -------------------------------------------------------
  // Location resolver: country/state/city/village OR lat/lon
  // -------------------------------------------------------
  private async resolveLocation(params: WeatherLocationParams) {
    const { country, state, city, village, lat, lon } = params;

    // 1️⃣ If any text-based location is provided → use geocoding
    if (country || state || city || village) {
      const parts = [village, city, state, country].filter(Boolean);
      const locationQuery = parts.join(', ');

      // Use the SAME geocoding method you used for soil:
      const { latitude, longitude, displayName } =
        await this.geocodingService.geocodeCity(locationQuery);
      // If your method is named differently (e.g. getCoordinates),
      // change only the line above.

      return { lat: latitude, lon: longitude, resolvedName: displayName };
    }

    // 2️⃣ Otherwise, lat/lon must be present
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
  // Helper: Basic text summary for cards
  // -------------------------------------------------------
  private buildSummary(
    temperature: number,
    humidity: number,
    windSpeed: number,
  ): string {
    const parts: string[] = [];

    if (temperature <= 10) parts.push('Cold');
    else if (temperature <= 20) parts.push('Cool');
    else if (temperature <= 30) parts.push('Warm');
    else parts.push('Hot');

    if (humidity >= 80) parts.push('and very humid');
    else if (humidity >= 60) parts.push('and humid');
    else if (humidity <= 30) parts.push('and dry');

    if (windSpeed >= 10) parts.push('with strong winds');
    else if (windSpeed >= 5) parts.push('with a breeze');

    return parts.join(' ');
  }
}
