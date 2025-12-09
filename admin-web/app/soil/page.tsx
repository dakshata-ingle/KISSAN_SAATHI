// app/soil/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import SoilHealthSmartCard from "./SoilHealthSmartCard";
import "./soil-health.css";

/**
 * Soil page: connected to backend.
 * Uses updated SoilHealthResponseDto from backend:
 *  - thermogram: SoilLayerDto[]
 *  - nutrients: NutrientDto[]
 *  - indices: SoilIndicesDto | null
 *  - crop: optional string
 */

type Depth = { label: string; temp: number; moisture: number };

const DEFAULT_DEPTHS: Depth[] = [
  { label: "5 cm", temp: 29.2, moisture: 66.9 },
  { label: "15 cm", temp: 25.3, moisture: 74.1 },
  { label: "50 cm", temp: 26.1, moisture: 86 },
  { label: "150 cm", temp: 26.8, moisture: 100 },
];

const TEMP_FORECAST = [
  { date: "11-10", "5 cm": 26.8, "15 cm": 25.5, "50 cm": 26.0, "150 cm": 27.0 },
  { date: "11-11", "5 cm": 26.6, "15 cm": 25.3, "50 cm": 25.9, "150 cm": 26.8 },
  { date: "11-12", "5 cm": 26.9, "15 cm": 25.2, "50 cm": 25.8, "150 cm": 26.7 },
  { date: "11-13", "5 cm": 26.5, "15 cm": 25.0, "50 cm": 25.9, "150 cm": 26.6 },
  { date: "11-14", "5 cm": 26.7, "15 cm": 25.1, "50 cm": 25.9, "150 cm": 26.7 },
  { date: "11-15", "5 cm": 26.6, "15 cm": 25.0, "50 cm": 25.8, "150 cm": 26.6 },
  { date: "11-16", "5 cm": 26.5, "15 cm": 24.9, "50 cm": 25.7, "150 cm": 26.5 },
];

const MOISTURE_FORECAST = [
  { date: "11-10", "5 cm": 0.66, "15 cm": 0.74, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-11", "5 cm": 0.67, "15 cm": 0.745, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-12", "5 cm": 0.665, "15 cm": 0.742, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-13", "5 cm": 0.66, "15 cm": 0.74, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-14", "5 cm": 0.668, "15 cm": 0.744, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-15", "5 cm": 0.667, "15 cm": 0.743, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-16", "5 cm": 0.666, "15 cm": 0.741, "50 cm": 0.86, "150 cm": 1.0 },
];

type SoilStats = {
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

type SoilIndices =
  | {
      ndvi?: number | null;
      ndre?: number | null;
      evi?: number | null;
      ndwi?: number | null;
      savi?: number | null;
      vari?: number | null;
      soilOrganicCarbon?: number | null;
      landSurfaceTemp?: number | null;
    }
  | null;

/* ---------- Small mapping helpers (convert backend DTO -> UI) ---------- */

function mapThermogramToDepths(thermogram: any[] | undefined, defaultDepths: Depth[]): Depth[] {
  if (!Array.isArray(thermogram) || thermogram.length === 0) {
    return defaultDepths.slice();
  }

  const mapped: Depth[] = thermogram.slice(0, defaultDepths.length).map((layer: any, idx: number) => ({
    label: layer?.depthLabel ?? defaultDepths[idx].label,
    temp: layer?.temperature != null && !Number.isNaN(Number(layer.temperature)) ? Number(layer.temperature) : defaultDepths[idx].temp,
    moisture:
      layer?.moisture != null && !Number.isNaN(Number(layer.moisture))
        ? Number(layer.moisture)
        : defaultDepths[idx].moisture,
  }));

  while (mapped.length < defaultDepths.length) {
    mapped.push({ ...defaultDepths[mapped.length] });
  }

  return mapped;
}

function mapNutrientsToSoilStats(nutrients: any[] | undefined, thermogram?: any[]): SoilStats {
  const byCode = (code: string) =>
    Array.isArray(nutrients) ? nutrients.find((n) => String(n?.code ?? "").toUpperCase() === code) : undefined;

  const deducedMoist =
    Array.isArray(thermogram) && thermogram.length
      ? thermogram[thermogram.length - 1]?.moisture ?? null
      : null;

  return {
    nitrogen: byCode("N")?.value ?? byCode("N")?.percentOfOptimal ?? null,
    phosphorus: byCode("P")?.value ?? byCode("P")?.percentOfOptimal ?? null,
    potassium: byCode("K")?.value ?? byCode("K")?.percentOfOptimal ?? null,
    organicCarbon: byCode("OC")?.value ?? byCode("OC")?.percentOfOptimal ?? null,
    zinc: byCode("ZN")?.value ?? byCode("ZN")?.percentOfOptimal ?? null,
    iron: byCode("FE")?.value ?? byCode("FE")?.percentOfOptimal ?? null,
    ph: byCode("PH")?.value ?? null,
    ec: byCode("EC")?.value ?? null,
    moisture: deducedMoist,
    sulfur: byCode("S")?.value ?? byCode("S")?.percentOfOptimal ?? null,
    copper: byCode("CU")?.value ?? byCode("CU")?.percentOfOptimal ?? null,
    boron: byCode("B")?.value ?? byCode("B")?.percentOfOptimal ?? null,
    manganese: byCode("MN")?.value ?? byCode("MN")?.percentOfOptimal ?? null,
  };
}

/* ---------- Inline chart utils (small, no external libs) ---------- */

type ForecastRow = { date: string; [depth: string]: number | string | undefined };

function getSeriesKeys(forecast: ForecastRow[]) {
  if (!Array.isArray(forecast) || forecast.length === 0) return [];
  return Object.keys(forecast[0]).filter((k) => k !== "date");
}

function computeYRange(forecast: ForecastRow[], seriesKeys: string[]) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  forecast.forEach((r) => {
    seriesKeys.forEach((k) => {
      const v = Number(r[k]);
      if (!Number.isNaN(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    });
  });
  if (min === Number.POSITIVE_INFINITY || max === Number.NEGATIVE_INFINITY) {
    min = 0;
    max = 1;
  }
  if (Math.abs(max - min) < 0.001) {
    // small range -> expand
    max = max + 1;
    min = Math.max(0, min - 1);
  }
  return { min, max };
}

/* ---------- Small presentational components inserted inline ---------- */

function SoilDepthListCard({ depths, title, unitLabel, lastUpdated }: { depths: Depth[]; title: string; unitLabel?: string; lastUpdated?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <div className="flex items-start gap-4">
        <div className="w-36 flex-shrink-0">
          <img src="/images/soil-stack.jpg" alt="soil stack" className="w-full h-auto object-contain" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
            {lastUpdated && <div className="text-xs text-gray-400">Last updated: {lastUpdated.split("T")[0]}</div>}
          </div>

          <div className="space-y-3">
            {depths.map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <div className="text-xs text-gray-600">{d.label}</div>
                </div>
                <div className="text-sm font-semibold">
                  {typeof d.temp === "number" && unitLabel === "°C" ? d.temp.toFixed(2) + " " + unitLabel : (d.temp ?? "-")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ForecastChartCard
 * - forecast: array of rows {date, "5 cm": val, "15 cm": val...}
 * - label: heading
 * - valueFormatter: (v) => string
 */
function ForecastChartCard({
  forecast,
  label,
  valueFormatter,
}: {
  forecast: ForecastRow[];
  label: string;
  valueFormatter?: (v: number) => string;
}) {
  const seriesKeys = getSeriesKeys(forecast);
  const { min, max } = computeYRange(forecast, seriesKeys);
  const width = 500;
  const height = 220;
  const padding = { top: 12, right: 10, bottom: 28, left: 36 };

  // auto color palette (repeatable)
  const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6"];

  // points for each series
  const seriesPoints = seriesKeys.map((key) => {
    const pts = forecast.map((row, idx) => {
      const x = padding.left + (idx / Math.max(1, forecast.length - 1)) * (width - padding.left - padding.right);
      const rawv = Number(row[key]);
      const t = Number.isNaN(rawv) ? min : rawv;
      const normalized = (t - min) / (max - min);
      const y = padding.top + (1 - normalized) * (height - padding.top - padding.bottom);
      return [x, y];
    });
    return { key, pts };
  });

  // helper to build path string
  const pathFor = (pts: number[][]) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="block">
            {/* background grid */}
            <defs>
              <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#f8fafc" stopOpacity="1" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width={width} height={height} fill="url(#g)" rx="8" />

            {/* horizontal lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const y = padding.top + t * (height - padding.top - padding.bottom);
              return <line key={i} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#eef2f7" strokeWidth={1} />;
            })}

            {/* series paths */}
            {seriesPoints.map((s, i) => {
              const d = pathFor(s.pts);
              const color = COLORS[i % COLORS.length];
              return (
                <g key={s.key}>
                  <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  {/* dots */}
                  {s.pts.map((p, idx) => (
                    <circle key={idx} cx={p[0]} cy={p[1]} r={2.5} fill={color} stroke="#fff" strokeWidth={0.5} />
                  ))}
                </g>
              );
            })}

            {/* x-axis labels */}
            {forecast.map((r, idx) => {
              const x = padding.left + (idx / Math.max(1, forecast.length - 1)) * (width - padding.left - padding.right);
              return (
                <text key={idx} x={x} y={height - 6} fontSize={10} textAnchor="middle" fill="#6b7280">
                  {r.date}
                </text>
              );
            })}

            {/* y-axis numeric ticks (3 ticks) */}
            {[0, 0.5, 1].map((t, i) => {
              const v = min + (1 - t) * (max - min);
              const y = padding.top + t * (height - padding.top - padding.bottom);
              return (
                <g key={i}>
                  <text x={8} y={y + 4} fontSize={11} fill="#9ca3af">
                    {valueFormatter ? valueFormatter(v) : v.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* legend */}
        <div className="w-36 flex-shrink-0">
          <div className="space-y-2">
            {seriesKeys.map((k, i) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span style={{ width: 12, height: 12, background: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6"][i % 4] }} className="inline-block rounded-sm" />
                <div className="text-gray-600">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page component ---------- */

export default function SoilPage() {
  const [selectedFarm, setSelectedFarm] = useState("My Farm 1");
  const [selectedFarmPolygon, setSelectedFarmPolygon] = useState<any | null>(null);

  // api state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soilStats, setSoilStats] = useState<SoilStats | null>(null);
  const [depths, setDepths] = useState<Depth[]>(DEFAULT_DEPTHS);
  const [indices, setIndices] = useState<SoilIndices | null>(null);
  const [tempForecast, setTempForecast] = useState<any[]>(TEMP_FORECAST);
  const [moistureForecast, setMoistureForecast] = useState<any[]>(MOISTURE_FORECAST);
  const [currentCrop, setCurrentCrop] = useState<string>("RICE");
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  // Allow developer to enable fallback default coords (for dev only).
  // Set NEXT_PUBLIC_ALLOW_DEFAULT_COORDS=true to allow fallback coords.
  const ALLOW_DEFAULT_COORDS = (process.env.NEXT_PUBLIC_ALLOW_DEFAULT_COORDS || "false").toLowerCase() === "true";
  const DEFAULT_COORDS = { lat: 19.0760, lon: 72.8777 }; // Mumbai (dev only)

  /**
   * Robust fetch helpers
   */
  async function parseResponseSafely(res: Response) {
    const text = await res.text().catch(() => "");
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      // Not JSON — return text under message
      return { message: text || `HTTP ${res.status}` };
    }
  }

  // fetch soil by lat/lon (single call)
  async function fetchSoilByCoords(lat: number, lon: number) {
    const url = `${API_BASE_URL}/soil?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const r = await fetch(url);
    if (!r.ok) {
      const errBody = await parseResponseSafely(r);
      const msg = typeof errBody.message === "string" ? errBody.message : `Failed to fetch soil data (${r.status})`;
      throw new Error(msg);
    }
    return r.json();
  }

  // POST polygon and get soil
  async function postPolygonAndGetSoil(polygon: any) {
    const r = await fetch(`${API_BASE_URL}/soil/area`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polygon }),
    });
    if (!r.ok) {
      const errBody = await parseResponseSafely(r);
      const msg = typeof errBody.message === "string" ? errBody.message : `Failed POST /soil/area (${r.status})`;
      throw new Error(msg);
    }
    return r.json();
  }

  // GET farm by name (if backend supports) and return polygon
  async function getFarmPolygonByName(farmName: string) {
    const r = await fetch(`${API_BASE_URL}/farm/${encodeURIComponent(farmName)}`);
    if (!r.ok) {
      return null;
    }
    const j = await r.json().catch(() => null);
    return j?.polygon ?? j?.geojson ?? null;
  }

  // Try to fetch coords from weather endpoint
  async function getCoordsFromWeather() {
    try {
      const w = await fetch(`${API_BASE_URL}/weather`);
      if (!w.ok) return null;
      const wjson = await w.json().catch(() => null);
      const lat = wjson?.location?.latitude ?? wjson?.coord?.lat ?? wjson?.latitude ?? null;
      const lon = wjson?.location?.longitude ?? wjson?.coord?.lon ?? wjson?.longitude ?? null;
      if (lat != null && lon != null) {
        return { lat: Number(lat), lon: Number(lon) };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * fetchSoil(): improved order and friendlier error handling
   *
   * Order:
   *  1) POST polygon to /soil/area (if polygon drawn)
   *  2) GET /farm/:name -> POST its polygon to /soil/area
   *  3) GET /weather -> use coords -> call /soil?lat=..&lon=..
   *  4) Try calling /soil (no params) only as last resort (and handle lat/lon error by retrying weather or fallback coords)
   */
  const fetchSoil = async () => {
    setError(null);
    setLoading(true);

    try {
      let raw: any | null = null;

      // 1) polygon provided by map -> POST
      if (selectedFarmPolygon) {
        try {
          raw = await postPolygonAndGetSoil(selectedFarmPolygon);
        } catch (err) {
          console.warn("POST /soil/area failed:", err);
        }
      }

      // 2) try farm polygon via /farm/:name
      if (!raw) {
        try {
          const polygonFromFarm = await getFarmPolygonByName(selectedFarm);
          if (polygonFromFarm) {
            try {
              raw = await postPolygonAndGetSoil(polygonFromFarm);
            } catch (err) {
              console.warn("POST /soil/area with farm polygon failed:", err);
            }
          }
        } catch (err) {
          console.debug("Error fetching farm/:name:", err);
        }
      }

      // 3) Try getting coords from /weather BEFORE calling /soil without params.
      //    This avoids hitting /soil with empty params in most cases.
      if (!raw) {
        const coordsFromWeather = await getCoordsFromWeather();
        if (coordsFromWeather) {
          try {
            raw = await fetchSoilByCoords(coordsFromWeather.lat, coordsFromWeather.lon);
          } catch (err) {
            console.warn("fetchSoilByCoords(using weather coords) failed:", err);
            // allow fallback to try /soil() below
          }
        }
      }

      // 4) As a last resort, call /soil with no params (backend might accept it or return useful message)
      if (!raw) {
        const r = await fetch(`${API_BASE_URL}/soil`);
        if (!r.ok) {
          const errBody = await parseResponseSafely(r);
          const msg = typeof errBody.message === "string" ? errBody.message : `Failed to fetch soil data (${r.status})`;

          // If backend explicitly complains about missing lat/lon, attempt one more automatic recovery:
          if (String(msg).toLowerCase().includes("lat") && String(msg).toLowerCase().includes("lon")) {
            // 4a) Try weather again (sometimes weather wasn't available earlier due to race or transient error)
            const coords = await getCoordsFromWeather();
            if (coords) {
              try {
                raw = await fetchSoilByCoords(coords.lat, coords.lon);
              } catch (err) {
                console.warn("Retry fetchSoilByCoords after lat/lon error failed:", err);
              }
            }

            // 4b) If still not resolved and developer enabled default coords, use them (dev only)
            if (!raw && ALLOW_DEFAULT_COORDS) {
              console.warn("Using default coords because weather did not provide coords and fallback is enabled.");
              raw = await fetchSoilByCoords(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon);
            }

            // 4c) If still no data -> throw a friendly error (don't show raw backend message)
            if (!raw) {
              throw new Error(
                "Location not available. Draw a polygon on the map or ensure backend /weather or /farm/:name returns coordinates."
              );
            }
          } else {
            // non-lat/lon error from /soil -> bubble it up (but we will show it in friendly form)
            throw new Error(msg);
          }
        } else {
          // /soil returned OK (rare) — parse result
          raw = await r.json().catch(() => null);
        }
      }

      // Final guard: if we still didn't get anything show helpful message
      if (!raw) {
        throw new Error(
          "Could not determine coordinates to fetch soil data. Draw a polygon on the map or enable coordinates in your backend."
        );
      }

      // ---- map the response to UI-friendly shapes ----
      const mappedDepths = mapThermogramToDepths(raw?.thermogram, DEFAULT_DEPTHS);
      setDepths(mappedDepths);

      const stats = mapNutrientsToSoilStats(raw?.nutrients, raw?.thermogram);
      setSoilStats(stats);

      setIndices(raw?.indices ?? raw?.mapLayers ?? null);
      setCurrentCrop(raw?.crop ?? raw?.recommendedCrop ?? currentCrop);

      if (Array.isArray(raw?.tempForecast) && raw.tempForecast.length) {
        setTempForecast(raw.tempForecast);
      } else {
        setTempForecast(TEMP_FORECAST);
      }

      if (Array.isArray(raw?.moistureForecast) && raw.moistureForecast.length) {
        setMoistureForecast(raw.moistureForecast);
      } else {
        setMoistureForecast(MOISTURE_FORECAST);
      }

      setLastUpdated(raw?.updatedAt ?? new Date().toISOString());
    } catch (err: any) {
      console.error("fetchSoil error:", err);

      // Map common backend messages to friendly text for the UI:
      const rawMsg = String(err?.message ?? "");
      if (rawMsg.toLowerCase().includes("lat") && rawMsg.toLowerCase().includes("lon")) {
        setError(
          "Location not provided by backend. Draw a polygon on the map, or ensure your backend exposes /weather or /farm/:name with coordinates."
        );
      } else {
        // show error message but keep it user-friendly
        setError(rawMsg || "Something went wrong while fetching soil data.");
      }
    } finally {
      setLoading(false);
    }
  };

  // fetch on mount
  useEffect(() => {
    fetchSoil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // memoize chart-friendly forecasts (convert moisture to percentages for display if necessary)
  const tempForecastMemo = useMemo(() => tempForecast as ForecastRow[], [tempForecast]);
  const moistureForecastMemo = useMemo(
    () =>
      (moistureForecast as ForecastRow[]).map((r) => {
        // if moisture is 0..1, convert to percent for chart visibility (but preserve original shape)
        const converted: any = { ...r };
        Object.keys(r).forEach((k) => {
          if (k === "date") return;
          const v = Number((r as any)[k]);
          if (!Number.isNaN(v) && v <= 1.5) {
            converted[k] = Number((v * 100).toFixed(3)); // convert to %
          } else {
            converted[k] = v;
          }
        });
        return converted;
      }),
    [moistureForecast]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-600">Farm</label>
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="rounded-md border px-3 py-1 bg-white"
          >
            <option>My Farm 1</option>
            <option>My Farm 2</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">Kisaan Saathi</div>
          <div className="h-9 w-9 rounded-full bg-green-500 text-white flex items-center justify-center">A</div>
        </div>
      </div>

      {/* NOTE: location & polygon handled by backend; UI allows polygon later */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="col-span-2">
          <div className="text-sm text-gray-600 mb-2">
            Location for soil analysis is provided by the backend. If you draw a polygon on the map it will POST to <code>/soil/area</code>. If not, frontend will attempt to get coords from /farm/:name or /weather.
          </div>
        </div>
        <div className="flex items-center md:justify-end">
          <button
            type="button"
            onClick={() => fetchSoil()}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Soil Data"}
          </button>
        </div>
      </div>

      {/* error */}
      {error && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* soil stats summary */}
      {soilStats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          {soilStats.nitrogen != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Nitrogen (N)</div>
              <div className="text-xl font-semibold">{soilStats.nitrogen}</div>
            </div>
          )}
          {soilStats.phosphorus != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Phosphorus (P)</div>
              <div className="text-xl font-semibold">{soilStats.phosphorus}</div>
            </div>
          )}
          {soilStats.potassium != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Potassium (K)</div>
              <div className="text-xl font-semibold">{soilStats.potassium}</div>
            </div>
          )}
          {soilStats.moisture != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Moisture</div>
              <div className="text-xl font-semibold">{soilStats.moisture} %</div>
            </div>
          )}
          {soilStats.ph != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">pH</div>
              <div className="text-xl font-semibold">{soilStats.ph}</div>
            </div>
          )}
          {soilStats.ec != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">EC</div>
              <div className="text-xl font-semibold">{soilStats.ec} dS/m</div>
            </div>
          )}
        </div>
      )}

      {/* Mithu Soil Health Smart Card */}
      <SoilHealthSmartCard
        depths={depths}
        soilStats={soilStats ?? null}
        indices={indices ?? null}
        tempForecast={tempForecast}
        farmName={selectedFarm}
        lastUpdated={lastUpdated}
        currentCrop={(currentCrop as any) ?? "RICE"}
      />

      {/* Temperature & Moisture + Forecasts (restored UI) */}
      <div className="grid grid-cols-12 gap-6 mt-6">
        {/* Left column: Soil Temperature Card */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          <SoilDepthListCard depths={depths} title="Soil Temperature (°C)" unitLabel="°C" lastUpdated={lastUpdated} />

          {/* Updated Soil Moisture card: matches Temperature layout */}
          <div className="bg-white rounded-lg shadow p-4 h-full">
            <div className="flex items-start gap-4">
              <div className="w-36 flex-shrink-0">
                <img src="/images/soil-stack.jpg" alt="soil stack" className="w-full h-auto object-contain" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Soil Moisture (%)</h3>
                  {lastUpdated && <div className="text-xs text-gray-400">Last updated: {lastUpdated.split("T")[0]}</div>}
                </div>

                <div className="space-y-3">
                  {depths.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md" style={{ minHeight: 44 }}>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-400" />
                        <div className="text-sm text-gray-600">{d.label}</div>
                      </div>
                      <div className="text-sm font-semibold">
                        {typeof d.moisture === "number" ? `${d.moisture.toFixed(1)}%` : `${d.moisture ?? "-"}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-3"> </div>
          </div>
          {/* End updated moisture card */}
        </div>

        {/* Right column: Forecast charts */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          <ForecastChartCard forecast={tempForecastMemo} label="Soil Temperature Forecast (Next 7 Days)" valueFormatter={(v) => `${Number(v).toFixed(1)}°C`} />
          <ForecastChartCard forecast={moistureForecastMemo} label="Soil Moisture Forecast (Next 7 Days)" valueFormatter={(v) => `${Number(v).toFixed(1)}%`} />
        </div>
      </div>
    </div>
  );
}
