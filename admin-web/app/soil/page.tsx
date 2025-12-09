// app/soil/page.tsx
"use client";

import React, { useEffect, useState } from "react";
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

type SoilIndices = {
  ndvi?: number | null;
  ndre?: number | null;
  evi?: number | null;
  ndwi?: number | null;
  savi?: number | null;
  vari?: number | null;
  soilOrganicCarbon?: number | null;
  landSurfaceTemp?: number | null;
} | null;

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

  /**
   * fetchSoil(): tries multiple strategies to obtain coords before calling backend:
   * 1) POST polygon to /soil/area (if polygon drawn)
   * 2) GET /farm/:name (if your backend exposes it) and POST its polygon to /soil/area
   * 3) GET /weather and take its lat/lon -> call /soil?lat=..&lon=..
   *
   * This prevents the "lat and lon query parameters are required" error when /soil needs coordinates.
   */
  const fetchSoil = async () => {
    setError(null);
    setLoading(true);

    // helper to fetch soil by lat/lon
    async function fetchSoilByCoords(lat: number, lon: number) {
      const url = `${API_BASE_URL}/soil?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const r = await fetch(url);
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        const msg = typeof errBody.message === "string" ? errBody.message : `Failed to fetch soil data (${r.status})`;
        throw new Error(msg);
      }
      return r.json();
    }

    // helper to post polygon
    async function postPolygonAndGetSoil(polygon: any) {
      const r = await fetch(`${API_BASE_URL}/soil/area`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polygon }),
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        const msg = typeof errBody.message === "string" ? errBody.message : `Failed POST /soil/area (${r.status})`;
        throw new Error(msg);
      }
      return r.json();
    }

    try {
      let raw: any | null = null;

      if (selectedFarmPolygon) {
        // 1) polygon provided by map -> POST
        try {
          raw = await postPolygonAndGetSoil(selectedFarmPolygon);
        } catch (err) {
          console.warn("POST /soil/area failed:", err);
          // continue to try alternate flows below
        }
      }

      // 2) if we still don't have data: try to get polygon from /farm/:name (if backend provides)
      if (!raw) {
        try {
          const farmResp = await fetch(`${API_BASE_URL}/farm/${encodeURIComponent(selectedFarm)}`);
          if (farmResp.ok) {
            const farmJson = await farmResp.json().catch(() => null);
            const polygonFromFarm = farmJson?.polygon ?? farmJson?.geojson ?? null;
            if (polygonFromFarm) {
              try {
                raw = await postPolygonAndGetSoil(polygonFromFarm);
              } catch (err) {
                console.warn("POST /soil/area with farm polygon failed:", err);
              }
            }
          } else {
            // farm endpoint might not exist; ignore but log
            console.debug(`/farm/${selectedFarm} returned ${farmResp.status}`);
          }
        } catch (err) {
          console.debug("fetch /farm/:name failed (maybe not implemented):", err);
        }
      }

      // 3) If still no data: use /weather to get coordinates (many apps provide this)
      if (!raw) {
        try {
          const w = await fetch(`${API_BASE_URL}/weather`);
          if (w.ok) {
            const wjson = await w.json().catch(() => null);
            const lat = wjson?.location?.latitude ?? wjson?.coord?.lat ?? wjson?.latitude ?? null;
            const lon = wjson?.location?.longitude ?? wjson?.coord?.lon ?? wjson?.longitude ?? null;
            if (lat != null && lon != null) {
              raw = await fetchSoilByCoords(Number(lat), Number(lon));
            } else {
              console.debug("weather endpoint returned but no coords found:", wjson);
            }
          } else {
            console.debug("/weather returned non-OK", w.status);
          }
        } catch (err) {
          console.debug("fetch /weather failed:", err);
        }
      }

      // 4) As a last resort: try calling /soil without params (will probably error)
      if (!raw) {
        const r = await fetch(`${API_BASE_URL}/soil`);
        if (!r.ok) {
          const errBody = await r.json().catch(() => ({}));
          const msg = typeof errBody.message === "string" ? errBody.message : `Failed to fetch soil data (${r.status})`;
          throw new Error(msg);
        }
        raw = await r.json();
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
      setError(err?.message ?? "Something went wrong while fetching soil data");
    } finally {
      setLoading(false);
    }
  };

  // fetch on mount
  useEffect(() => {
    fetchSoil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <div className="h-9 w-9 rounded-full bg-green-500 text-white flex items-center justify-center">
            A
          </div>
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

      {/* (rest of UI: temperature/moisture cards + charts) */}
      <div className="grid grid-cols-12 gap-6">
        {/* ... (reuse the UI blocks from previous file) ... */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          {/* Temperature card */}
          {/* (omitted here for brevity - unchanged UI, paste your existing card blocks) */}
        </div>
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          {/* Forecast cards */}
        </div>
      </div>
    </div>
  );
}
