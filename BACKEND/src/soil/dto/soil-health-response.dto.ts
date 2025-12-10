// src/soil/dto/soil-health-response.dto.ts

// --- Reused PRD types (kept as-is, slightly extended) ---

export type SoilLayerStatus = "GREEN" | "GOLD" | "RED" | "BLUE";

export class SoilLayerDto {
  depthLabel!: string;        // "0–10 cm"
  temperature!: number | null;
  moisture!: number | null;
  status!: SoilLayerStatus;
}

export type NutrientStatus = "DEFICIENT" | "MONITOR" | "GOOD" | "EXCESS";

// PM nutrient codes
export type NutrientCode =
  | "N"   // Nitrogen
  | "P"   // Phosphorus
  | "K"   // Potassium
  | "B"   // Boron
  | "ZN"  // Zinc
  | "FE"  // Iron
  | "MN"  // Manganese
  | "CU"  // Copper
  | "S"   // Sulphur
  | "OC"  // Organic Carbon
  | "PH"  // pH
  | "EC"; // Electrical Conductivity

export class NutrientDto {
  code!: NutrientCode;
  name!: string;            // "Nitrogen", "Phosphorus"... (UI friendly)
  value!: number | null;    // ppm, mg/kg etc.
  unit!: string;
  percentOfOptimal?: number | null; // 0–100
  status!: NutrientStatus;
  // optional: source & method (ml|heuristic)
  source?: string;
  method?: "ml" | "heuristic";
  confidence?: number; // 0..1
}

export class ActionStepDto {
  id!: string;
  priority!: number;              // 1, 2, 3...
  title!: string;                 // "Correct Moisture First"
  description!: string;
  zoneId?: string;               // e.g. "Zone 1"
  category!: "MOISTURE" | "TEMP" | "NUTRIENT" | "MICRO" | "GENERAL";
}

export class MapLayersDto {
  ndviTileUrl?: string;    // Plant health
  ndreTileUrl?: string;    // Stress detection
  eviTileUrl?: string;     // Dense vegetation
  ndwiTileUrl?: string;    // Water stress
  saviTileUrl?: string;    // Soil-adjusted vegetation
  variTileUrl?: string;    // Crop greenness

  moistureTileUrl?: string;
  pMapTileUrl?: string;
  kMapTileUrl?: string;
  vraGeoJson?: any;        // future
}

export class SoilIndicesDto {
  ndvi?: number | null;
  ndre?: number | null;
  evi?: number | null;
  ndwi?: number | null;
  savi?: number | null;
  vari?: number | null;
  soilOrganicCarbon?: number | null; // %
  landSurfaceTemp?: number | null; // °C
}

// --- Additional types to support the new service response shape ---

export type ConfidenceLabel = "high" | "medium" | "low";

/** Minimal soil baseline fields (from SoilGrids) */
export class SoilBaselineFieldDto {
  value?: number | null;
  depthCm?: number;
  source?: string;
  unit?: string;
}

/** A flexible shape for the derived estimates returned by the model/service */
export interface DerivedEstimate {
  value: number | null;
  unit: string;
  confidence: number; // 0..1
  method: "ml" | "heuristic";
  // optional: human-readable status (e.g., 'Low', 'Medium', 'High')
  status?: string;
}

// --- Final unified response DTO (compatible with both PRD and current service) ---

export class SoilHealthResponseDto {
  // --- PRD fields (keep to satisfy frontend & PM) ---
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };

  // thermogram: layered representation (optional)
  thermogram?: SoilLayerDto[];

  // nutrients: list of NutrientDto (preferred by frontend)
  nutrients?: NutrientDto[];

  // action plan per PRD (optional)
  actionPlan?: ActionStepDto[];

  // map layers (tile URLs / visualization)
  mapLayers?: MapLayersDto;

  // timestamp
  updatedAt?: string;

  // crop (optional)
  crop?: string;

  // summarized indices
  indices?: SoilIndicesDto | null;

  // --- Fields added for backend/service compatibility ---

  /** centroid available as lon/lat */
  centroid?: { lon: number; lat: number };

  /** area in hectares (optional) */
  areaHectares?: number;

  /** Soil baseline object (SoilGrids-derived priors) */
  soilBaseline?: {
    pH?: SoilBaselineFieldDto;
    organicCarbon?: SoilBaselineFieldDto;
    clayPct?: number | null;
    siltPct?: number | null;
    sandPct?: number | null;
    [key: string]: any;
  };

  /**
   * indicesSummary: an optional container for the computed spectral index summaries
   * (keeps earlier service shape intact)
   */
  indicesSummary?: {
    ndvi_mean?: number | null;
    ndvi_std?: number | null;
    ndvi_trend_30d?: number | null;
    ndre_mean?: number | null;
    bsi_mean?: number | null;
    valid_obs_count?: number | null;
    cloud_coverage_pct?: number | null;
    [key: string]: any;
  };

  /**
   * derivedEstimates: map of nutrient code (or friendly label) to estimate object
   * This is the canonical data your ML/service returns (12 nutrients).
   */
  derivedEstimates?: {
    [nutrient in NutrientCode]?: DerivedEstimate;
  } & {
    // allow legacy keys like 'N','P','K' or 'Nitrogen' if needed
    [key: string]: DerivedEstimate | undefined;
  };

  /** Qualitative confidence flags */
  confidenceFlags?: {
    overall?: ConfidenceLabel;
    details?: { [nutrient: string]: ConfidenceLabel };
  };

  /** Human-friendly recommendation */
  recommendation?: string;

  // --- backward-compat helpers (optional convenience fields) ---
  /**
   * Convenience: materialize `nutrients[]` from `derivedEstimates` if server prefers list form
   * (When populating on server, you can either fill `nutrients` or `derivedEstimates` or both)
   */
  // nutrients?: NutrientDto[]  // already declared above

  // Any additional fields (forward-compatible)
  [key: string]: any;
}
