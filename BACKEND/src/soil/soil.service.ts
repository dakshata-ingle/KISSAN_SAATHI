// BACKEND/src/soil/soil.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as turf from '@turf/turf';
import { v4 as uuidv4 } from 'uuid';

// DTO import optional if you want typed returns
// import { SoilHealthResponseDto } from './dto/soil-health-response.dto';

@Injectable()
export class SoilService {
  private readonly logger = new Logger(SoilService.name);

  private readonly SOILGRIDS_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
  private readonly SENTINELHUB_URL = process.env.SENTINELHUB_PROCESS_URL || 'https://services.sentinel-hub.com/api/v1/process';
  private readonly SENTINELHUB_TOKEN = process.env.SENTINELHUB_TOKEN || '';
  private readonly ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000/predict';

  // In-memory job store for demo. Replace with DB (Postgres/PostGIS) in prod.
  private jobStore: Record<string, any> = {};

  constructor(private readonly http: HttpService) {}

  // -----------------------
  // Public API (called by controller)
  // -----------------------

  /**
   * Return SoilHealthResponseDto-like object for a point (lat, lon).
   * Uses SoilGrids + placeholder indices + heuristics/ML.
   */
  async getSoilAnalysisByCoords(lat: number, lon: number) {
    try {
      // Validate inputs
      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
        throw new HttpException('Invalid coordinates', HttpStatus.BAD_REQUEST);
      }

      // Build a small point GeoJSON for reuse with aggregator
      const pointGeom = turf.point([lon, lat]);

      // Soil baseline from SoilGrids (centroid point)
      const soilBaseline = await this.fetchSoilGrids(lon, lat);

      // Sentinel indices aggregation — for demo returns placeholders
      const indicesSummary = await this.fetchSentinelIndices(pointGeom, {});

      // DEM & Weather connectors - placeholders/extend these
      const dem = { elevation: null, slope: null };
      const weather = { rainfall_30d: null, rainfall_90d: null };

      // Assemble features
      const features = this.assembleFeatures(soilBaseline, indicesSummary, dem, weather, { areaHectares: 0.0, cropType: null });

      // Try ML then heuristics
      let derivedEstimates: Record<string, any> = {};
      try {
        const mlResp = await firstValueFrom(this.http.post(this.ML_SERVICE_URL, features));
        if (mlResp && mlResp.data && mlResp.data.success && mlResp.data.predictions) {
          derivedEstimates = mlResp.data.predictions;
          for (const k of Object.keys(derivedEstimates)) derivedEstimates[k].method = derivedEstimates[k].method || 'ml';
        } else {
          this.logger.warn('ML returned invalid response - using heuristics');
          derivedEstimates = this.runHeuristics(features);
        }
      } catch (err) {
        this.logger.warn('ML call failed in getSoilAnalysisByCoords: ' + (err?.message || err));
        derivedEstimates = this.runHeuristics(features);
      }

      // Confidence flags
      const confidenceFlags = this.buildConfidenceFlags(derivedEstimates);

      // Synthesize recommendation
      const overallConfNumeric = this.averageConfidence(derivedEstimates);
      const recommendation = this.makeRecommendation(derivedEstimates, overallConfNumeric);

      // Build response object (matches SoilHealthResponseDto shape)
      const resp = {
        centroid: { lon, lat },
        areaHectares: 0.0,
        soilBaseline,
        indicesSummary,
        derivedEstimates,
        recommendation,
        confidenceFlags,
      };

      return resp;
    } catch (err) {
      this.logger.error('getSoilAnalysisByCoords failed: ' + (err?.message || err));
      if (err instanceof HttpException) throw err;
      throw new HttpException('Failed to compute soil analysis', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create a soil assessment job for a provided GeoJSON area.
   * For demo: processes synchronously and stores result in memory.
   * In production: enqueue job to queue (Bull/Redis) and return jobId immediately.
   */
  async createAssessment(payload: any) {
    if (!payload || !payload.area) {
      throw new HttpException('Payload must include area (GeoJSON)', HttpStatus.BAD_REQUEST);
    }

    const jobId = uuidv4();
    // store job meta (processing)
    this.jobStore[jobId] = { jobId, status: 'processing', createdAt: new Date().toISOString() };

    // Synchronous processing for demo (dangerous for huge polygons)
    try {
      const result = await this.processAssessmentSync(jobId, payload);
      // update store
      this.jobStore[jobId] = { jobId, status: 'completed', result, updatedAt: new Date().toISOString() };
      return { jobId, status: 'completed', result };
    } catch (err) {
      this.jobStore[jobId] = { jobId, status: 'failed', error: err?.message || String(err) };
      this.logger.error('createAssessment failed: ' + (err?.message || err));
      throw new HttpException('Assessment failed: ' + (err?.message || err), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieve previously computed assessment by jobId from in-memory store (demo).
   * Replace with DB lookup in production.
   */
  async getAssessment(jobId: string) {
    if (!jobId) throw new HttpException('jobId required', HttpStatus.BAD_REQUEST);
    const job = this.jobStore[jobId];
    if (!job) throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    return job;
  }

  // -----------------------
  // Internal helpers
  // -----------------------

  /** Synchronous processing used by createAssessment demo */
  private async processAssessmentSync(jobId: string, payload: any) {
    // accept either Point or Polygon; compute centroid for SoilGrids and indices aggregation
    const geom = payload.area;
    let centroidCoords: number[] | null = null;

    try {
      const centroid = turf.centroid(geom);
      centroidCoords = centroid.geometry.coordinates; // [lon, lat]
    } catch (err) {
      throw new Error('Invalid GeoJSON area provided');
    }

    const [lon, lat] = centroidCoords;
    const areaSqMeters = turf.area(geom);
    const areaHectares = areaSqMeters / 10000.0;

    // SoilGrids baseline
    const soilBaseline = await this.fetchSoilGrids(lon, lat);

    // Sentinel indices (placeholder or real)
    const indicesSummary = await this.fetchSentinelIndices(geom, payload);

    // DEM & weather placeholders
    const dem = { elevation: null, slope: null };
    const weather = { rainfall_30d: null, rainfall_90d: null };

    // Assemble features
    const features = this.assembleFeatures(soilBaseline, indicesSummary, dem, weather, { areaHectares, cropType: payload.cropType });

    // ML call with fallback
    let derivedEstimates: Record<string, any> = {};
    try {
      const mlResp = await firstValueFrom(this.http.post(this.ML_SERVICE_URL, features));
      if (mlResp && mlResp.data && mlResp.data.success && mlResp.data.predictions) {
        derivedEstimates = mlResp.data.predictions;
        for (const k of Object.keys(derivedEstimates)) derivedEstimates[k].method = derivedEstimates[k].method || 'ml';
      } else {
        this.logger.warn('ML returned invalid response in processAssessmentSync - using heuristics');
        derivedEstimates = this.runHeuristics(features);
      }
    } catch (err) {
      this.logger.warn('ML call failed in processAssessmentSync: ' + (err?.message || err));
      derivedEstimates = this.runHeuristics(features);
    }

    const confidenceFlags = this.buildConfidenceFlags(derivedEstimates);
    const overallConfNumeric = this.averageConfidence(derivedEstimates);
    const recommendation = this.makeRecommendation(derivedEstimates, overallConfNumeric);

    const dto = {
      jobId,
      status: 'completed',
      centroid: { lon, lat },
      areaHectares,
      soilBaseline,
      indicesSummary,
      derivedEstimates,
      recommendation,
      confidenceFlags,
    };

    return dto;
  }

  /** SoilGrids REST point query */
  private async fetchSoilGrids(lon: number, lat: number) {
    try {
      const url = `${this.SOILGRIDS_URL}?lon=${lon}&lat=${lat}`;
      const res = await firstValueFrom(this.http.get(url));
      return this.parseSoilGridsResponse(res.data);
    } catch (err) {
      this.logger.warn('fetchSoilGrids failed: ' + (err?.message || err));
      return {
        pH: { value: null, source: 'SoilGrids' },
        organicCarbon: { value: null, unit: '%', source: 'SoilGrids' },
        clayPct: null,
        siltPct: null,
        sandPct: null,
      };
    }
  }

  /** Parse SoilGrids response into simple 0-30cm aggregates (approx) */
  private parseSoilGridsResponse(resp: any) {
    const props = resp?.properties ?? {};
    const pickLayerMean = (propName: string) => {
      const entry = props[propName];
      if (!entry || !entry.values) return null;
      const vals = entry.values.filter((v) => v.value !== null && !isNaN(v.value)).map((v) => v.value);
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    return {
      pH: { value: pickLayerMean('phh2o'), depthCm: 0, source: 'SoilGrids' },
      organicCarbon: { value: pickLayerMean('soc'), unit: '%', source: 'SoilGrids' },
      clayPct: pickLayerMean('clay'),
      siltPct: pickLayerMean('silt'),
      sandPct: pickLayerMean('sand'),
    };
  }

  /**
   * Sentinel Hub process API evalscript call.
   * NOTE: Often returns binary (GeoTIFF/PNG). For quick demo, this returns placeholder summary.
   * Replace with a method that either:
   *  - requests server-side statistics from Sentinel Hub (if available in your plan), or
   *  - downloads GeoTIFF, reads raster and computes polygon aggregates (node geotiff or Python rasterio).
   */
  private async fetchSentinelIndices(geom: any, payload: any) {
    const now = new Date();
    const toDate = now.toISOString();
    const fromDate = payload.fromDate || new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString();

    const processScript = `// Evalscript to compute NDVI and NDRE
function setup() {
  return {
    input: [{ bands: ["B04","B05","B08","B11"] }],
    output: [{ id:"ndvi", bands:1, sampleType:"FLOAT32" },{ id:"ndre", bands:1, sampleType:"FLOAT32" }]
  };
}
function evaluatePixel(sample) {
  var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  var ndre = (sample.B08 - sample.B05) / (sample.B08 + sample.B05);
  return { ndvi:[ndvi], ndre:[ndre] };
}`;

    const body = {
      input: {
        bounds: geom,
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: { timeRange: { from: fromDate, to: toDate } },
            processing: { atmosphericCorrection: 'none' },
          },
        ],
      },
      process: { script: processScript },
    };

    try {
      const headers = {
        Authorization: `Bearer ${this.SENTINELHUB_TOKEN}`,
        'Content-Type': 'application/json',
      };
      // NOTE: responseType arraybuffer - sentinel returns imagery; we don't parse here.
      const res = await firstValueFrom(this.http.post(this.SENTINELHUB_URL, body, { headers, responseType: 'arraybuffer' }));
      this.logger.log('SentinelHub call completed (bytes). Placeholder aggregation returned for demo.');
      return {
        summary: {
          ndvi_mean: 0.42,
          ndvi_std: 0.12,
          ndvi_trend_30d: -0.01,
          ndre_mean: 0.18,
          bsi_mean: 0.05,
          valid_obs_count: 6,
          cloud_coverage_pct: 12,
        },
      };
    } catch (err) {
      this.logger.warn('fetchSentinelIndices failed: ' + (err?.message || err));
      return {
        summary: {
          ndvi_mean: null,
          ndvi_std: null,
          ndvi_trend_30d: null,
          ndre_mean: null,
          bsi_mean: null,
          valid_obs_count: 0,
          cloud_coverage_pct: null,
        },
      };
    }
  }

  /** Assemble features for ML or heuristics */
  private assembleFeatures(soilBaseline: any, indices: any, dem: any, weather: any, meta: any) {
    const f: any = {};
    f.pH_0_30 = soilBaseline.pH?.value ?? null;
    f.soc_0_30 = soilBaseline.organicCarbon?.value ?? null;
    f.clay = soilBaseline.clayPct ?? null;
    f.silt = soilBaseline.siltPct ?? null;
    f.sand = soilBaseline.sandPct ?? null;
    f.ndvi_mean_90d = indices?.summary?.ndvi_mean ?? null;
    f.ndvi_std_90d = indices?.summary?.ndvi_std ?? null;
    f.ndvi_trend_30d = indices?.summary?.ndvi_trend_30d ?? null;
    f.ndre_mean_90d = indices?.summary?.ndre_mean ?? null;
    f.bsi_mean_90d = indices?.summary?.bsi_mean ?? null;
    f.valid_obs_count = indices?.summary?.valid_obs_count ?? 0;
    f.cloud_pct = indices?.summary?.cloud_coverage_pct ?? null;
    f.area_ha = meta.areaHectares ?? null;
    f.cropType = meta.cropType ?? null;
    f.elevation = dem?.elevation ?? null;
    f.rainfall_30d = weather?.rainfall_30d ?? null;
    return f;
  }

  /** Heuristics fallback returning all 12 nutrients conservatively */
  private runHeuristics(features: any) {
    const out: Record<string, any> = {};
    const soc = features.soc_0_30 ?? 0;
    const ndvi = features.ndvi_mean_90d ?? 0;

    if (soc < 0.6 && ndvi < 0.35) {
      out['N'] = { value: 120, unit: 'kg/ha', confidence: 0.45, method: 'heuristic' };
    } else {
      out['N'] = { value: 200, unit: 'kg/ha', confidence: 0.6, method: 'heuristic' };
    }

    out['P'] = { value: 25, unit: 'kg/ha', confidence: 0.4, method: 'heuristic' };
    out['K'] = { value: 180, unit: 'kg/ha', confidence: 0.45, method: 'heuristic' };
    out['OC'] = { value: soc || 0.8, unit: '%', confidence: soc ? 0.7 : 0.4, method: 'heuristic' };
    out['pH'] = { value: features.pH_0_30 ?? 6.5, unit: 'pH', confidence: features.pH_0_30 ? 0.8 : 0.4, method: 'heuristic' };
    out['EC'] = { value: 0.5, unit: 'dS/m', confidence: 0.5, method: 'heuristic' };
    out['S'] = { value: 12, unit: 'mg/kg', confidence: 0.45, method: 'heuristic' };
    out['Fe'] = { value: 35, unit: 'mg/kg', confidence: 0.6, method: 'heuristic' };
    out['Zn'] = { value: 1.5, unit: 'mg/kg', confidence: 0.5, method: 'heuristic' };
    out['Cu'] = { value: 0.8, unit: 'mg/kg', confidence: 0.5, method: 'heuristic' };
    out['B'] = { value: 0.5, unit: 'mg/kg', confidence: 0.45, method: 'heuristic' };
    out['Mn'] = { value: 40, unit: 'mg/kg', confidence: 0.6, method: 'heuristic' };

    return out;
  }

  /** Build qualitative confidence flags */
  private buildConfidenceFlags(derived: Record<string, any>) {
    const details: Record<string, string> = {};
    let sum = 0;
    let cnt = 0;
    for (const k of Object.keys(derived)) {
      const c = derived[k].confidence ?? 0.4;
      sum += c; cnt++;
      details[k] = c >= 0.7 ? 'high' : c >= 0.5 ? 'medium' : 'low';
    }
    const overall = cnt ? (sum / cnt) : 0;
    const overallLabel = overall >= 0.7 ? 'high' : overall >= 0.5 ? 'medium' : 'low';
    return { overall: overallLabel, details };
  }

  /** Average numeric confidence */
  private averageConfidence(derived: Record<string, any>) {
    let sum = 0; let cnt = 0;
    for (const k of Object.keys(derived)) {
      const c = derived[k].confidence ?? 0.4;
      sum += c; cnt++;
    }
    return cnt ? sum / cnt : 0;
  }

  /** Recommendation synth */
  private makeRecommendation(derived: Record<string, any>, overallConf: number) {
    const lowConf = overallConf < 0.6;
    let rec = lowConf ? 'Provisional estimates — recommend laboratory confirmation.' : 'Provisional recommendations based on model.';
    if (derived['N'] && derived['P'] && derived['K']) {
      rec += ` Estimated N:${Math.round(derived['N'].value)} kg/ha, P:${Math.round(derived['P'].value)} kg/ha, K:${Math.round(derived['K'].value)} kg/ha.`;
    }
    return rec;
  }
}
