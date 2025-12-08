import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as turf from '@turf/turf';
import { addDays, formatISO } from 'date-fns';

// Type for sampled point results
type SampleResult = {
  lat: number;
  lon: number;
  data: any;
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
  private readonly DEFAULT_TIMEZONE = 'UTC';
  private readonly MAX_SAMPLES = 5;

  async getWeatherForArea(opts: {
    latitude?: number;
    longitude?: number;
    polygon?: any;
    timezone?: string;
  }): Promise<any> {
    const timezone = opts.timezone ?? this.DEFAULT_TIMEZONE;

    if (opts.polygon) {
      const samples = this.samplePointsFromPolygon(opts.polygon, this.MAX_SAMPLES);
      const results: SampleResult[] = [];

      for (const [lon, lat] of samples) {
        const res = await this.fetchPointWeather(lat, lon, timezone);
        results.push({ lat, lon, data: res });
      }

      const aggregated = this.aggregateSampleResults(results);
      return {
        type: 'polygon',
        samplePoints: results.map(r => ({ lat: r.lat, lon: r.lon })),
        aggregated,
      };
    } else {
      const lat = opts.latitude!;
      const lon = opts.longitude!;
      const data = await this.fetchPointWeather(lat, lon, timezone);
      return {
        type: 'point',
        location: { latitude: lat, longitude: lon },
        data,
      };
    }
  }

  // samplePointsFromPolygon returns array of [lon, lat] coordinates (GeoJSON convention)
  private samplePointsFromPolygon(polygonGeoJSON: any, maxSamples = 5): Array<[number, number]> {
    try {
      const bbox = turf.bbox(polygonGeoJSON);
      const width = bbox[2] - bbox[0];
      const cellSide = Math.max(0.02, Math.min(0.75, width / 6));
      const grid = turf.pointGrid(bbox, cellSide, { units: 'kilometers' });

      const ptsInsideFC = turf.pointsWithinPolygon(grid, polygonGeoJSON);
      const coords = ptsInsideFC.features.map(
        f => f.geometry.coordinates as [number, number],
      );

      if (coords.length === 0) {
        const c = turf.centroid(polygonGeoJSON).geometry.coordinates as [number, number];
        return [c];
      }

      if (coords.length <= maxSamples) return coords.slice(0, maxSamples);

      const step = Math.floor(coords.length / maxSamples) || 1;
      const sampled: Array<[number, number]> = [];
      for (let i = 0; sampled.length < maxSamples && i < coords.length; i += step) {
        sampled.push(coords[i]);
      }
      return sampled.slice(0, maxSamples);
    } catch (err) {
      this.logger.warn('samplePointsFromPolygon failed, falling back to centroid', err);
      try {
        const c = turf.centroid(polygonGeoJSON).geometry.coordinates as [number, number];
        return [c];
      } catch (e) {
        throw new Error('Invalid polygon GeoJSON provided');
      }
    }
  }

  // Fetch combined data for a point (lat, lon)
  private async fetchPointWeather(lat: number, lon: number, timezone: string): Promise<any> {
    try {
      const today = new Date();
      const endDate = formatISO(today, { representation: 'date' }); // YYYY-MM-DD
      const startDate = formatISO(addDays(today, -30), { representation: 'date' });

      const hourlyParams = [
        'temperature_2m',
        'relativehumidity_2m',
        'apparent_temperature',
        'precipitation',
        'surface_pressure',
        'windspeed_10m',
        'winddirection_10m',
      ].join(',');

      const dailyParams = [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'sunrise',
        'sunset',
      ].join(',');

      const urlRange =
        `${this.OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
        `&hourly=${hourlyParams}` +
        `&daily=${dailyParams}` +
        `&start_date=${startDate}&end_date=${endDate}` +
        `&timezone=${encodeURIComponent(timezone)}`;

      this.logger.debug(`Open-Meteo range URL: ${urlRange}`);
      const respRange = await axios.get(urlRange, { timeout: 15000 });
      const payloadRange = respRange.data;

      const forecast7 = await this.fetch7DayForecast(lat, lon, timezone);

      const current = this.computeCurrentFromPayload(payloadRange);

      const history30 = {
        start_date: startDate,
        end_date: endDate,
        hourly: payloadRange.hourly ?? null,
      };

      return {
        metadata: {
          timezone: payloadRange.timezone ?? timezone,
          open_meteo_response_keys: Object.keys(payloadRange || {}),
        },
        current,
        hourly: payloadRange.hourly ?? null,
        dailyRange: payloadRange.daily ?? null,
        forecast7,
        history30,
      };
    } catch (err) {
      this.logger.error(
        'fetchPointWeather error',
        err?.response?.data ?? err.message ?? err,
      );
      throw err;
    }
  }

private computeCurrentFromPayload(payload: any): any {
  try {
    const now = new Date();
    const times: string[] = payload?.hourly?.time ?? [];
    if (!times || times.length === 0) return null;

    // find index of latest time <= now
    let idx = times.length - 1;
    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      if (t > now) {
        idx = Math.max(0, i - 1);
        break;
      }
    }

    const current: any = { time: times[idx] };

    // copy current value for each hourly key
    for (const key of Object.keys(payload.hourly)) {
      if (key === "time") continue;
      const arr = payload.hourly[key];
      current[key] =
        Array.isArray(arr) && arr[idx] !== undefined ? arr[idx] : null;
    }

    // 🔹 Friendly aliases for frontend

    // Humidity: prefer correct Open-Meteo key, fall back to old one if present
    const rh =
      (typeof current.relative_humidity_2m === "number"
        ? current.relative_humidity_2m
        : undefined) ??
      (typeof current.relativehumidity_2m === "number"
        ? current.relativehumidity_2m
        : undefined) ??
      null;

    if (rh !== null) {
      current.humidity = rh;
    }

    // Rain: alias from precipitation
    if (current.precipitation !== undefined && current.precipitation !== null) {
      current.rain = current.precipitation;
    }

    return current;
  } catch (err) {
    return null;
  }
}


  // get 7-day forward forecast
  private async fetch7DayForecast(lat: number, lon: number, timezone: string): Promise<any> {
    const start = formatISO(new Date(), { representation: 'date' });
    const end = formatISO(addDays(new Date(), 7), { representation: 'date' });

    const dailyParams = [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'sunrise',
      'sunset',
    ].join(',');
    const hourlyParams = [
      'temperature_2m',
      'relativehumidity_2m',
      'apparent_temperature',
      'precipitation',
      'surface_pressure',
      'windspeed_10m',
      'winddirection_10m',
    ].join(',');

    const url =
      `${this.OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
      `&daily=${dailyParams}&hourly=${hourlyParams}` +
      `&start_date=${start}&end_date=${end}&timezone=${encodeURIComponent(timezone)}`;

    this.logger.debug(`Open-Meteo forecast7 URL: ${url}`);
    const resp = await axios.get(url, { timeout: 15000 });
    return resp.data;
  }

  // Simple aggregation (means) across samplePoints for numeric fields
  private aggregateSampleResults(results: SampleResult[]): any {
    const aggregated: any = { current: {}, sampleCount: results.length };

    // numeric keys in current
    const numericKeys = new Set<string>();
    for (const r of results) {
      if (r.data?.current) {
        Object.keys(r.data.current).forEach(k => {
          if (typeof r.data.current[k] === 'number') numericKeys.add(k);
        });
      }
    }

    for (const k of Array.from(numericKeys)) {
      let sum = 0;
      let count = 0;
      for (const r of results) {
        const v = r.data?.current?.[k];
        if (typeof v === 'number') {
          sum += v;
          count += 1;
        }
      }
      aggregated.current[k] = count ? sum / count : null;
    }

    // 🔹 Frontend-friendly aliases for aggregated current
    if (
      typeof aggregated.current['relativehumidity_2m'] === 'number' ||
      aggregated.current['relativehumidity_2m'] === null
    ) {
      aggregated.current.humidity = aggregated.current['relativehumidity_2m'];
    }
    if (
      typeof aggregated.current['precipitation'] === 'number' ||
      aggregated.current['precipitation'] === null
    ) {
      aggregated.current.rain = aggregated.current['precipitation'];
    }

    // hourly aggregation if times match
    try {
      const baseHourly = results[0]?.data?.hourly;
      if (baseHourly && baseHourly.time) {
        const time = baseHourly.time;
        aggregated.hourly = { time: time };
        for (const key of Object.keys(baseHourly)) {
          if (key === 'time') continue;
          const arrLength = baseHourly[key].length;
          const aggArr = new Array(arrLength).fill(0);
          const counts = new Array(arrLength).fill(0);

          for (const r of results) {
            const h = r.data?.hourly;
            if (!h || !h[key] || h[key].length !== arrLength) {
              continue;
            }
            for (let i = 0; i < arrLength; i++) {
              const val = h[key][i];
              if (typeof val === 'number') {
                aggArr[i] += val;
                counts[i] += 1;
              }
            }
          }
          aggregated.hourly[key] = aggArr.map((s, i) =>
            counts[i] ? s / counts[i] : null,
          );
        }

        // 🔹 Add hourly humidity/rain arrays for frontend
        if (aggregated.hourly.relativehumidity_2m) {
          aggregated.hourly.humidity = aggregated.hourly.relativehumidity_2m;
        }
        if (aggregated.hourly.precipitation) {
          aggregated.hourly.rain = aggregated.hourly.precipitation;
        }
      }
    } catch (e) {
      this.logger.warn('hourly aggregation failed', e);
      aggregated.hourly = null;
    }

    // daily7 aggregation
    try {
      const baseDaily = results[0]?.data?.forecast7?.daily;
      if (baseDaily && baseDaily.time) {
        const days = baseDaily.time.length;
        aggregated.daily7 = { time: baseDaily.time };
        for (const key of Object.keys(baseDaily)) {
          if (key === 'time') continue;
          const arr = new Array(days).fill(0);
          const counts = new Array(days).fill(0);
          for (const r of results) {
            const d = r.data?.forecast7?.daily;
            if (!d || !d[key] || d[key].length !== days) continue;
            for (let i = 0; i < days; i++) {
              const val = d[key][i];
              if (typeof val === 'number') {
                arr[i] += val;
                counts[i] += 1;
              }
            }
          }
          aggregated.daily7[key] = arr.map((s, i) =>
            counts[i] ? s / counts[i] : null,
          );
        }
      }
    } catch (e) {
      this.logger.warn('daily aggregation failed', e);
      aggregated.daily7 = null;
    }

    aggregated.history30 = results[0]?.data?.history30 ?? null;

    return aggregated;
  }
}
