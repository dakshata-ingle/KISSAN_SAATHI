// app/soil/soilLogic.ts
// Intelligence layer for temperature, moisture, nutrients & vegetation indices

export type CropKey = "WHEAT" | "RICE";

export const CROP_RANGES: Record<
  CropKey,
  { T_MIN: number; T_MAX: number; NAME: string }
> = {
  WHEAT: { T_MIN: 18, T_MAX: 22, NAME: "Wheat (Rabi)" },
  RICE: { T_MIN: 25, T_MAX: 30, NAME: "Rice (Kharif)" },
};

const COLORS = {
  GREEN: "var(--ks-prosperity-green)",
  GOLD: "var(--ks-harvest-gold)",
  RED: "var(--ks-risk-red)",
  SAT_BLUE: "var(--ks-saturation-blue)",
};

export type TempStatus = "Optimal" | "Monitor" | "Critical";

export function getSoilTempStatus(
  T: number,
  crop: CropKey
): { status: TempStatus; color: string; advisory: string } {
  // ensure T is numeric
  const temp = Number.isFinite(T) ? T : NaN;
  const { T_MIN, T_MAX, NAME } = CROP_RANGES[crop] ?? CROP_RANGES.RICE;

  if (!Number.isFinite(temp)) {
    return {
      status: "Monitor",
      color: COLORS.GOLD,
      advisory: `Temperature data unavailable for ${NAME}.`,
    };
  }

  if (temp >= T_MIN && temp <= T_MAX) {
    return {
      status: "Optimal",
      color: COLORS.GREEN,
      advisory: `Perfect! Ideal for ${NAME} growth.`,
    };
  }

  if ((temp > T_MAX && temp <= T_MAX + 3) || (temp < T_MIN && temp >= T_MIN - 3)) {
    const msg =
      temp > T_MAX ? "Borderline warm. Monitor irrigation." : "Borderline cool. Growth may slow.";
    return { status: "Monitor", color: COLORS.GOLD, advisory: msg };
  }

  const msg =
    temp > T_MAX + 3
      ? `CRITICAL: Too hot for ${NAME}. Risk of root damage.`
      : `CRITICAL: Too cold for ${NAME}. Risk of germination failure.`;

  return { status: "Critical", color: COLORS.RED, advisory: msg };
}

// Moisture %

export type MoistureStatus = "CRITICAL DRY" | "DRY" | "OPTIMAL" | "SATURATED";

export function getMoistureStatus(
  moisturePercent: number | null | undefined
): { status: MoistureStatus; color: string; advisory: string } {
  const m = Number.isFinite(Number(moisturePercent)) ? Number(moisturePercent) : NaN;

  const CRIT_LOW = 10;
  const LOW = 20;
  const OPT = 35;
  const HIGH = 50;

  if (!Number.isFinite(m)) {
    return {
      status: "OPTIMAL",
      color: COLORS.GREEN,
      advisory: "Moisture data not available; monitor in-field sensors.",
    };
  }

  if (m < CRIT_LOW) {
    return {
      status: "CRITICAL DRY",
      color: COLORS.RED,
      advisory: "Severe drought stress. Immediate irrigation required.",
    };
  }
  if (m < LOW) {
    return {
      status: "DRY",
      color: COLORS.GOLD,
      advisory: "Moisture low. Plan light irrigation.",
    };
  }
  if (m > HIGH) {
    return {
      status: "SATURATED",
      color: COLORS.SAT_BLUE,
      advisory: "Soil saturated. Check drainage, pause irrigation.",
    };
  }
  return {
    status: "OPTIMAL",
    color: COLORS.GREEN,
    advisory: "Moisture levels are ideal.",
  };
}

// Color for a layer where moisture can override temp
export function getLayerColor(tempStatus: TempStatus, moistureStatus: MoistureStatus): string {
  if (moistureStatus === "CRITICAL DRY") return COLORS.RED;
  if (moistureStatus === "SATURATED") return COLORS.SAT_BLUE;

  if (tempStatus === "Critical") return COLORS.RED;
  if (tempStatus === "Monitor") return COLORS.GOLD;
  return COLORS.GREEN;
}

// Worst temp status across depths for a day
export function getOverallWorstStatus(temps: number[] | undefined, crop: CropKey): TempStatus {
  if (!Array.isArray(temps) || temps.length === 0) return "Monitor";
  const order: TempStatus[] = ["Critical", "Monitor", "Optimal"];
  let worst: TempStatus = "Optimal";

  for (const t of temps) {
    const { status } = getSoilTempStatus(t, crop);
    if (order.indexOf(status) < order.indexOf(worst)) {
      worst = status;
    }
  }
  return worst;
}

// NPK / micronutrients

export type NutrientKey = "N" | "P" | "K" | "Zn" | "S" | "Fe" | "Cu" | "B" | "Mn";

const N_THRESHOLDS: Record<NutrientKey, { optimal: number; max: number }> = {
  N: { optimal: 280, max: 400 },
  P: { optimal: 15, max: 30 },
  K: { optimal: 250, max: 400 },
  Zn: { optimal: 1, max: 2 },
  S: { optimal: 10, max: 20 },
  Fe: { optimal: 5, max: 10 },
  Cu: { optimal: 1, max: 3 },
  B: { optimal: 0.5, max: 1.5 },
  Mn: { optimal: 3, max: 8 },
};

export function getNutrientStatus(
  level: number | undefined | null,
  element: NutrientKey
): { status: "Deficient" | "Excess" | "Monitor" | "Good"; color: string } {
  if (level == null || Number.isNaN(level)) {
    return { status: "Monitor", color: COLORS.GOLD };
  }

  const thresholds = N_THRESHOLDS[element];
  const opt = thresholds.optimal;
  const max = thresholds.max;

  if (level < opt * 0.7) {
    return { status: "Deficient", color: COLORS.RED };
  }
  if (level > max) {
    return { status: "Excess", color: COLORS.RED };
  }
  if (level >= opt * 0.7 && level <= opt * 1.3) {
    return { status: "Good", color: COLORS.GREEN };
  }
  return { status: "Monitor", color: COLORS.GOLD };
}

/* ---------------- Vegetation Indices ---------------- */

export type VegetationIndexKey =
  | "NDVI"
  | "NDRE"
  | "EVI"
  | "NDWI"
  | "SAVI"
  | "VARI"
  | "SOC"
  | "LST";

export type SoilIndices = {
  ndvi?: number;
  ndre?: number;
  evi?: number;
  ndwi?: number;
  savi?: number;
  vari?: number;
  soilOrganicCarbon?: number; // %
  landSurfaceTemp?: number; // °C
} | null;

export type IndexEvalStatus = "Good" | "Moderate" | "Poor";

export type IndexEval = {
  status: IndexEvalStatus;
  color: string;
  label: string;
  hint: string;
};

export function evalVegetationIndex(key: VegetationIndexKey, value?: number | null): IndexEval {
  if (value == null || Number.isNaN(value)) {
    return {
      status: "Moderate",
      color: COLORS.GOLD,
      label: "No data",
      hint: "Index not available for this field.",
    };
  }

  const v = value;

  switch (key) {
    case "NDVI": {
      if (v < 0.2)
        return {
          status: "Poor",
          color: COLORS.RED,
          label: v.toFixed(2),
          hint: "Low plant health. Check nutrients & pests.",
        };
      if (v < 0.4)
        return {
          status: "Moderate",
          color: COLORS.GOLD,
          label: v.toFixed(2),
          hint: "Average health. Monitor carefully.",
        };
      return {
        status: "Good",
        color: COLORS.GREEN,
        label: v.toFixed(2),
        hint: "Healthy vegetation cover.",
      };
    }
    case "NDRE": {
      if (v > 0.4)
        return {
          status: "Poor",
          color: COLORS.RED,
          label: v.toFixed(2),
          hint: "High stress in canopy. Possible nutrient stress.",
        };
      if (v > 0.25)
        return {
          status: "Moderate",
          color: COLORS.GOLD,
          label: v.toFixed(2),
          hint: "Some stress signs. Watch top leaves.",
        };
      return {
        status: "Good",
        color: COLORS.GREEN,
        label: v.toFixed(2),
        hint: "Low canopy stress.",
      };
    }
    case "EVI": {
      if (v < 0.2)
        return {
          status: "Poor",
          color: COLORS.RED,
          label: v.toFixed(2),
          hint: "Sparse or weak dense vegetation.",
        };
      if (v < 0.4)
        return {
          status: "Moderate",
          color: COLORS.GOLD,
          label: v.toFixed(2),
          hint: "Medium vegetation density.",
        };
      return {
        status: "Good",
        color: COLORS.GREEN,
        label: v.toFixed(2),
        hint: "Dense, healthy vegetation.",
      };
    }
    case "NDWI": {
      if (v < -0.1)
        return {
          status: "Poor",
          color: COLORS.RED,
          label: v.toFixed(2),
          hint: "High water stress. Soil drying.",
        };
      if (v < 0.1)
        return {
          status: "Moderate",
          color: COLORS.GOLD,
          label: v.toFixed(2),
          hint: "Borderline moisture. Plan irrigation.",
        };
      return {
        status: "Good",
        color: COLORS.GREEN,
        label: v.toFixed(2),
        hint: "Good canopy moisture.",
      };
    }
    case "SAVI":
    case "VARI": {
      if (v < 0.1)
        return {
          status: "Poor",
          color: COLORS.RED,
          label: v.toFixed(2),
          hint: "Low greenness. Poor crop stand.",
        };
      if (v < 0.25)
        return {
          status: "Moderate",
          color: COLORS.GOLD,
          label: v.toFixed(2),
          hint: "Average greenness.",
        };
      return {
        status: "Good",
        color: COLORS.GREEN,
        label: v.toFixed(2),
        hint: "Good crop greenness.",
      };
    }
    case "SOC": {
      if (v < 0.4)
        return {
          status: "Poor",
          color: COLORS.RED,
          label: `${v.toFixed(2)}%`,
          hint: "Very low soil organic carbon. Add FYM/compost.",
        };
      if (v < 0.8)
        return {
          status: "Moderate",
          color: COLORS.GOLD,
          label: `${v.toFixed(2)}%`,
          hint: "Medium SOC. Maintain with organic inputs.",
        };
      return {
        status: "Good",
        color: COLORS.GREEN,
        label: `${v.toFixed(2)}%`,
        hint: "Good soil carbon. Soil is fertile.",
      };
    }
    case "LST": {
      if (v > 38)
        return {
          status: "Poor",
          color: COLORS.RED,
          label: `${v.toFixed(1)}°C`,
          hint: "Very high crop stress from heat.",
        };
      if (v > 32)
        return {
          status: "Moderate",
          color: COLORS.GOLD,
          label: `${v.toFixed(1)}°C`,
          hint: "Warm canopy. Monitor irrigation and heat.",
        };
      return {
        status: "Good",
        color: COLORS.GREEN,
        label: `${v.toFixed(1)}°C`,
        hint: "Comfortable temperature for crop.",
      };
    }
    default:
      return {
        status: "Moderate",
        color: COLORS.GOLD,
        label: Number.isFinite(v) ? v.toFixed(2) : String(v),
        hint: "Index value.",
      };
  }
}
