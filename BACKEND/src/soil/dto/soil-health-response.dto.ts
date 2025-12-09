// Simple v1 DTO based on PRD
export type SoilLayerStatus = "GREEN" | "GOLD" | "RED" | "BLUE";

export class SoilLayerDto {
  depthLabel: string;        // "0–10 cm"
  temperature: number | null;
  moisture: number | null;
  status: SoilLayerStatus;
}

export type NutrientStatus = "DEFICIENT" | "MONITOR" | "GOOD" | "EXCESS";

// ✅ add all nutrients PM wants
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
  code: NutrientCode;
  name: string;            // "Nitrogen", "Phosphorus"...
  value: number | null;    // ppm, mg/kg etc.
  unit: string;
  percentOfOptimal: number | null; // 0–100
  status: NutrientStatus;
}


export class ActionStepDto {
  id: string;
  priority: number;              // 1, 2, 3...
  title: string;                 // "Correct Moisture First"
  description: string;
  zoneId?: string;               // e.g. "Zone 1"
  category: "MOISTURE" | "TEMP" | "NUTRIENT" | "MICRO" | "GENERAL";
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

export class SoilHealthResponseDto {
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  thermogram: SoilLayerDto[];
  nutrients: NutrientDto[];
  actionPlan: ActionStepDto[];
  mapLayers: MapLayersDto;
  updatedAt: string;
  crop?: string;                 // e.g. "RICE" or "WHEAT"
  indices?: SoilIndicesDto | null;
}
