// app/soil/SoilHealthSmartCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  CROP_RANGES,
  CropKey,
  evalVegetationIndex,
  getLayerColor,
  getMoistureStatus,
  getNutrientStatus,
  getOverallWorstStatus,
  getSoilTempStatus,
} from "./soilLogic";

type DepthLayer = {
  label: string;
  temp: number;
  moisture: number;
};

export type SoilStats = {
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  moisture?: number | null;
  ph?: number | null;
  ec?: number | null;
  organicCarbon?: number | null;
  sulfur?: number | null;
  iron?: number | null;
  zinc?: number | null;
  copper?: number | null;
  boron?: number | null;
  manganese?: number | null;
};

type TempForecastRow = {
  date: string;
  "5 cm": number;
  "15 cm": number;
  "50 cm": number;
  "150 cm": number;
};

type Props = {
  depths: DepthLayer[]; // must be an array (page ensures defaults)
  soilStats?: SoilStats | null;
  // indices can be either the numeric indices object (ndvi, ndre...) OR
  // the mapLayers object returned by backend (ndviTileUrl etc). Accept any.
  indices?: any | null;
  tempForecast?: TempForecastRow[];
  farmName?: string;
  lastUpdated?: string;
  currentCrop?: CropKey | string;
};

/* ---------- Mithu mood derivation ---------- */

type MithuMood = "happy" | "watchful" | "worried" | "critical";

function deriveMithuMood(
  depths: DepthLayer[],
  soilStats: SoilStats | null,
  indices: any | null,
  crop: CropKey | string
): {
  mood: MithuMood;
  headline: string;
  subline: string;
  tags: string[];
} {
  const issues: string[] = [];
  const deep = depths && depths.length > 0 ? depths[depths.length - 1] : { temp: NaN, moisture: NaN, label: "" };

  const deepTemp = getSoilTempStatus(typeof deep.temp === "number" ? deep.temp : NaN, crop as CropKey);
  const deepMoisture = getMoistureStatus(typeof deep.moisture === "number" ? deep.moisture : null);

  if (deepTemp.status === "Critical") {
    issues.push("Deep soil temperature is critical.");
  } else if (deepTemp.status === "Monitor") {
    issues.push("Deep soil temperature is borderline.");
  }

  if (deepMoisture.status === "CRITICAL DRY" || deepMoisture.status === "SATURATED") {
    issues.push(`Deep moisture is ${deepMoisture.status.toLowerCase()}.`);
  }

  if (soilStats) {
    const n = getNutrientStatus(soilStats.nitrogen ?? undefined, "N");
    if (n.status === "Deficient" || n.status === "Excess") {
      issues.push("Nitrogen level needs correction.");
    }
    const p = getNutrientStatus(soilStats.phosphorus ?? undefined, "P");
    if (p.status === "Deficient" || p.status === "Excess") {
      issues.push("Phosphorus level is imbalanced.");
    }
    const k = getNutrientStatus(soilStats.potassium ?? undefined, "K");
    if (k.status === "Deficient" || k.status === "Excess") {
      issues.push("Potassium level is not ideal.");
    }
  }

  if (indices) {
    // Accept indices either as numeric { ndvi: 0.3 } or as mapLayers with tile URLs
    const ndviVal = indices.ndvi ?? indices.ndviValue ?? null;
    const ndwiVal = indices.ndwi ?? indices.ndwiValue ?? null;
    const socVal = indices.soilOrganicCarbon ?? indices.soc ?? null;

    const ndviEval = evalVegetationIndex("NDVI", ndviVal);
    if (ndviEval.status === "Poor") {
      issues.push("Plant health (NDVI) is low.");
    }
    const ndwiEval = evalVegetationIndex("NDWI", ndwiVal);
    if (ndwiEval.status === "Poor") {
      issues.push("Water stress detected (NDWI).");
    }
    const socEval = evalVegetationIndex("SOC", socVal);
    if (socEval.status === "Poor") {
      issues.push("Soil organic carbon is very low.");
    }
  }

  let mood: MithuMood = "happy";
  if (issues.length > 0) {
    mood = "watchful";
  }
  if (
    deepTemp.status === "Critical" ||
    deepMoisture.status === "CRITICAL DRY" ||
    deepMoisture.status === "SATURATED"
  ) {
    mood = "worried";
  }
  if (
    issues.some((i) => i.toLowerCase().includes("critical")) ||
    (indices && evalVegetationIndex("LST", indices.landSurfaceTemp ?? indices.lst ?? null).status === "Poor")
  ) {
    mood = "critical";
  }

  let headline = "";
  let subline = "";

  switch (mood) {
    case "happy":
      headline = "Soil looks healthy and ready!";
      subline =
        "Ideal temperature, moisture & nutrients for your crop. Maintain current schedule.";
      break;
    case "watchful":
      headline = "Overall good, but keep an eye.";
      subline =
        "Some parameters are borderline. Mithu suggests careful monitoring this week.";
      break;
    case "worried":
      headline = "Attention needed on deep soil.";
      subline =
        "Deep soil heat or moisture is risky. Follow the action plan below today.";
      break;
    case "critical":
      headline = "CRITICAL: Immediate action required.";
      subline =
        "Multiple stress signals detected. Prioritise irrigation and nutrient correction.";
      break;
  }

  const tags: string[] = [];
  if (deepTemp.status !== "Optimal") tags.push(`Deep temp: ${deepTemp.status}`);
  if (deepMoisture.status !== "OPTIMAL") tags.push(`Deep moisture: ${deepMoisture.status}`);
  if (soilStats?.nitrogen != null) tags.push(`N: ${getNutrientStatus(soilStats.nitrogen, "N").status}`);
  if (indices?.ndvi != null) tags.push(`NDVI: ${evalVegetationIndex("NDVI", indices.ndvi).status}`);

  return { mood, headline, subline, tags };
}

/* ---------- NPK bar component ---------- */

const NPKBar: React.FC<{
  element: "N" | "P" | "K" | "Zn" | "S" | "Fe" | "Cu" | "B" | "Mn";
  label: string;
  level?: number | null;
}> = ({ element, label, level }) => {
  const { status, color } = getNutrientStatus(level ?? undefined, element);
  const thresholdsMax: Record<typeof element, number> = {
    N: 400,
    P: 30,
    K: 400,
    Zn: 2,
    S: 20,
    Fe: 10,
    Cu: 3,
    B: 1.5,
    Mn: 8,
  };
  const max = thresholdsMax[element];
  const value = typeof level === "number" ? level : max * 0.6;
  const width = Math.min(100, (value / max) * 100);

  return (
    <div className="ks-nutrient-item">
      <span className="ks-nutrient-label" style={{ color }}>
        {label}
      </span>
      <div className="ks-nutrient-bar-wrap">
        <div
          className="ks-nutrient-bar"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="ks-nutrient-status" style={{ color }}>
        {status}
      </span>
    </div>
  );
};

/* ---------- Main component ---------- */

export const SoilHealthSmartCard: React.FC<Props> = ({
  depths = [],
  soilStats = null,
  indices = null,
  tempForecast = [],
  farmName = "",
  lastUpdated,
  currentCrop = "RICE",
}) => {
  const [planOpen, setPlanOpen] = useState(false);

  // ensure crop is a valid CropKey for logic functions (fallback to RICE)
  const cropKey: CropKey = (String(currentCrop).toUpperCase() === "WHEAT" ? "WHEAT" : "RICE") as CropKey;
  const cropInfo = CROP_RANGES[cropKey];

  const getAvg = (values: number[]) =>
    values && values.length > 0
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      : "—";

  const mithuMood = useMemo(() => deriveMithuMood(depths ?? [], soilStats ?? null, indices ?? null, cropKey), [
    depths,
    soilStats,
    indices,
    cropKey,
  ]);

  const deep = (depths && depths.length > 0 ? depths[depths.length - 1] : { label: "N/A", temp: NaN, moisture: NaN }) as DepthLayer;
  const deepestTemp = getSoilTempStatus(typeof deep.temp === "number" ? deep.temp : NaN, cropKey);
  const deepestMoisture = getMoistureStatus(typeof deep.moisture === "number" ? deep.moisture : null);
  const deepColor = getLayerColor(deepestTemp.status, deepestMoisture.status);

  // AI action plan – you can later drive this from backend
  const treatmentPlan = [
    {
      priority: "CRITICAL",
      icon: "💧",
      title: "Deep irrigation to stabilise heat & moisture",
      details: "Run irrigation for 6–8 hours to cool and re-wet 60–100 cm soil layers.",
      zone: "Main plot",
      target: "Start tonight before 5:00 AM.",
    },
    {
      priority: "URGENT",
      icon: "🧪",
      title: "Adjust Nitrogen & Zinc levels",
      details: "Apply suggested N + Zn dose as per soil card to correct deficiency.",
      zone: "Entire field",
      target: "Within next 48 hours.",
    },
  ];

  const indexCards = [
    { key: "NDVI" as const, label: "NDVI", purpose: "Plant health", value: indices?.ndvi ?? indices?.ndviValue ?? null },
    { key: "NDRE" as const, label: "NDRE", purpose: "Stress detection", value: indices?.ndre ?? null },
    { key: "EVI" as const, label: "EVI", purpose: "Dense vegetation accuracy", value: indices?.evi ?? null },
    { key: "NDWI" as const, label: "NDWI", purpose: "Water stress", value: indices?.ndwi ?? null },
    { key: "SAVI" as const, label: "SAVI", purpose: "Soil-adjusted vegetation", value: indices?.savi ?? null },
    { key: "VARI" as const, label: "VARI", purpose: "Crop greenness", value: indices?.vari ?? null },
    { key: "SOC" as const, label: "Soil Organic Carbon", purpose: "Soil fertility", value: indices?.soilOrganicCarbon ?? indices?.soc ?? null },
    { key: "LST" as const, label: "Land Surface Temp", purpose: "Crop heat stress", value: indices?.landSurfaceTemp ?? indices?.lst ?? null },
  ];

  return (
    <div className="ks-soil-card-root">
      {/* Header */}
      <div className="ks-soil-header">
        <div className="ks-soil-title">Soil Temperature Health</div>
        <div className="ks-soil-context">
          <span role="img" aria-label="parrot" style={{ fontSize: "1.3rem" }}>
            🦜
          </span>
          <span>
            Your Soil Co-Pilot: Analyzing {cropInfo?.NAME ?? currentCrop} requirements on {farmName}
          </span>
        </div>
      </div>

      {/* Mithu mood panel */}
      <div className="ks-mithu-panel">
        <div className="ks-mithu-avatar">
          <img src="/images/mithu.jpg" alt="Mithu the Soil Co-Pilot" />
        </div>
        <div className="ks-mithu-meta">
          <div className="ks-mithu-headline">{mithuMood.headline}</div>
          <div className="ks-mithu-subline">{mithuMood.subline}</div>
          <div className="ks-mithu-tags">
            {mithuMood.tags.map((t) => (
              <span key={t} className="ks-mithu-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast cards */}
      <div className="ks-forecast-section-title">5-Day Soil Forecast</div>
      <div className="ks-forecast-slider">
        {(tempForecast ?? []).slice(0, 5).map((row, index) => {
          const temps = [row?.["5 cm"], row?.["15 cm"], row?.["50 cm"], row?.["150 cm"]].map((v) =>
            Number.isFinite(Number(v)) ? Number(v) : NaN
          );
          const validTemps = temps.filter(Number.isFinite);
          const status = getOverallWorstStatus(validTemps.length ? validTemps : undefined, cropKey);
          const avg = validTemps.length ? getAvg(validTemps) : "—";
          const dayLabel = index === 0 ? "Today" : row?.date ?? `Day ${index + 1}`;

          return (
            <div key={row?.date ?? index} className={`ks-forecast-card status-${status}`}>
              <div className="ks-forecast-card-day">{dayLabel}</div>
              <div className="ks-forecast-card-temp">{avg}°C</div>
              <div
                className="ks-forecast-card-status"
                style={{
                  color: status === "Critical" ? "var(--ks-risk-red)" : "var(--ks-soil-black)",
                }}
              >
                {status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Thermogram + Digital Soil Health Card side by side */}
      <div className="ks-thermo-section-title">Diagnostic View (Depth-wise) & Digital Soil Health Card</div>
      <div className="ks-thermo-layout">
        {/* Thermogram */}
        <div className="ks-thermo-cylinder-wrap">
          <div className="ks-thermo-cylinder">
            <div className="ks-thermo-grass-top" />
            {(depths ?? []).map((d) => {
              const tempResult = getSoilTempStatus(Number.isFinite(d.temp) ? d.temp : NaN, cropKey);
              const moistureResult = getMoistureStatus(Number.isFinite(d.moisture) ? d.moisture : null);
              const color = getLayerColor(tempResult.status, moistureResult.status);
              return (
                <div key={d.label} className="ks-thermo-layer" style={{ backgroundColor: color }}>
                  <div className="ks-thermo-depth">{d.label}</div>
                  <div className="ks-thermo-data-group">
                    <div className="ks-thermo-temp">{Number.isFinite(d.temp) ? d.temp.toFixed(1) : "—"}°C ({tempResult.status})</div>
                    <div className="ks-thermo-moisture">💧 {Number.isFinite(d.moisture) ? d.moisture.toFixed(1) : "—"}% ({moistureResult.status})</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Digital Soil Health Card snapshot */}
        <div className="ks-healthcard">
          <div className="ks-healthcard-header">
            <div className="ks-healthcard-title">Digital Soil Health Card</div>
            <div className="ks-healthcard-meta">{lastUpdated ? `Updated: ${lastUpdated}` : "Live sensor data"}</div>
          </div>
          <table className="ks-healthcard-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="ks-healthcard-row">
                <td>pH</td>
                <td>{soilStats?.ph ?? "—"}</td>
                <td>-</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>EC</td>
                <td>{soilStats?.ec ?? "—"}</td>
                <td>dS/m</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Organic Carbon (OC)</td>
                <td>{soilStats?.organicCarbon ?? indices?.soilOrganicCarbon ?? "—"}</td>
                <td>%</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Nitrogen (N)</td>
                <td>{soilStats?.nitrogen ?? "—"}</td>
                <td>kg/ha</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Phosphorus (P)</td>
                <td>{soilStats?.phosphorus ?? "—"}</td>
                <td>kg/ha</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Potassium (K)</td>
                <td>{soilStats?.potassium ?? "—"}</td>
                <td>kg/ha</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Sulphur (S)</td>
                <td>{soilStats?.sulfur ?? "—"}</td>
                <td>kg/ha</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Zinc (Zn)</td>
                <td>{soilStats?.zinc ?? "—"}</td>
                <td>ppm</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Iron (Fe)</td>
                <td>{soilStats?.iron ?? "—"}</td>
                <td>ppm</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Copper (Cu)</td>
                <td>{soilStats?.copper ?? "—"}</td>
                <td>ppm</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Boron (B)</td>
                <td>{soilStats?.boron ?? "—"}</td>
                <td>ppm</td>
              </tr>
              <tr className="ks-healthcard-row">
                <td>Available Manganese (Mn)</td>
                <td>{soilStats?.manganese ?? "—"}</td>
                <td>ppm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Nutrient dashboard */}
      <div className="ks-nutrient-section-title">Nutrient Dashboard (NPK & Micronutrients)</div>
      <div className="ks-nutrient-gauges">
        <NPKBar element="N" label="N" level={soilStats?.nitrogen ?? null} />
        <NPKBar element="P" label="P" level={soilStats?.phosphorus ?? null} />
        <NPKBar element="K" label="K" level={soilStats?.potassium ?? null} />
        <NPKBar element="S" label="S" level={soilStats?.sulfur ?? null} />
        <NPKBar element="Zn" label="Zn" level={soilStats?.zinc ?? null} />
        <NPKBar element="Fe" label="Fe" level={soilStats?.iron ?? null} />
        <NPKBar element="Cu" label="Cu" level={soilStats?.copper ?? null} />
        <NPKBar element="B" label="B" level={soilStats?.boron ?? null} />
        <NPKBar element="Mn" label="Mn" level={soilStats?.manganese ?? null} />
      </div>

      {/* Vegetation indices */}
      <div className="ks-index-section-title">Satellite Vegetation Indices (Field Health Overview)</div>
      <div className="ks-index-grid">
        {indexCards.map((card) => {
          const evalRes = evalVegetationIndex(card.key as any, card.value);
          return (
            <div key={card.label} className="ks-index-card">
              <div className="ks-index-header">
                <div>
                  <div className="ks-index-name">{card.label}</div>
                  <div className="ks-index-purpose">{card.purpose}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="ks-index-value" style={{ color: evalRes.color }}>
                    {evalRes.label}
                  </div>
                  <div className="ks-index-status-pill" style={{ backgroundColor: `${evalRes.color}22`, color: evalRes.color }}>
                    {evalRes.status}
                  </div>
                </div>
              </div>
              <div className="ks-index-hint">{evalRes.hint}</div>
            </div>
          );
        })}
      </div>

      {/* Action plan */}
      <button type="button" className="ks-treatment-toggle" onClick={() => setPlanOpen((p) => !p)}>
        ACTION PLAN: Soil Correction Schedule
        <span>{planOpen ? "▲ Hide" : "▼ View"}</span>
      </button>

      {planOpen && (
        <div className="ks-treatment-steps">
          <p className="ks-treatment-note">
            <strong>Mithu’s Advice:</strong>{" "}
            <span style={{ color: deepColor, fontWeight: 600 }}>
              Deep soil is {deepestTemp.status} / {deepestMoisture.status}.
            </span>{" "}
            Complete Step 1 tonight, then follow nutrient correction.
          </p>
          {treatmentPlan.map((step, idx) => (
            <div key={idx} className="ks-treatment-card">
              <div className="ks-treatment-icon">{step.icon}</div>
              <div>
                <div className="ks-treatment-chip">{step.priority} • #{idx + 1}</div>
                <div className="ks-treatment-body-title">{step.title}</div>
                <div className="ks-treatment-body-detail">{step.details}</div>
                <div className="ks-treatment-body-target">Target: {step.zone} ({step.target})</div>
                <button type="button" className="ks-treatment-button">Implement &amp; Track</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoilHealthSmartCard;
