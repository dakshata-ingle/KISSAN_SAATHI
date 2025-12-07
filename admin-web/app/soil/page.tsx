// app/soil/page.tsx
"use client";

import React, { useState } from "react";

/**
 * Soil page: now connected to backend.
 * - Location form (country/state/city/village)
 * - Fetches soil data from NestJS backend
 * - Shows N, P, K, Moisture, pH, EC
 * - Keeps your existing charts + badges
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
  { date: "11-13", "5 cm": 0.66, "15 cm": 0.740, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-14", "5 cm": 0.668, "15 cm": 0.744, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-15", "5 cm": 0.667, "15 cm": 0.743, "50 cm": 0.86, "150 cm": 1.0 },
  { date: "11-16", "5 cm": 0.666, "15 cm": 0.741, "50 cm": 0.86, "150 cm": 1.0 },
];

type SoilStats = {
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  moisture?: number;
  ph?: number;
  ec?: number;
};

/* --- tiny responsive line + area charts (unchanged) --- */
function MiniLineChart({
  data,
  keys,
  colors,
  height = 220,
}: {
  data: any[];
  keys: string[];
  colors: string[];
  height?: number;
}) {
  const allValues: number[] = [];
  data.forEach((row) => keys.forEach((k) => allValues.push(Number(row[k]))));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const w = Math.max(520, data.length * 90);
  const h = height;
  const padX = 36;
  const padY = 18;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const stepX = innerW / Math.max(1, data.length - 1);
  const yFor = (v: number) =>
    max === min
      ? padY + innerH / 2
      : padY + innerH - ((v - min) / (max - min)) * innerH;
  const pointsFor = (key: string) =>
    data
      .map((d, i) => `${padX + i * stepX},${yFor(Number(d[key]))}`)
      .join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={padX}
            x2={w - padX}
            y1={padY + innerH * t}
            y2={padY + innerH * t}
            stroke="#eef2f7"
            strokeWidth={1}
          />
        ))}
        {keys.map((k, idx) => (
          <polyline
            key={k}
            fill="none"
            stroke={colors[idx] ?? "#888"}
            strokeWidth={2}
            points={pointsFor(k)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {data.map((d, i) =>
          keys.map((k, idx) => (
            <circle
              key={`${i}-${k}`}
              cx={padX + i * stepX}
              cy={yFor(Number(d[k]))}
              r={3}
              fill={colors[idx] ?? "#333"}
            />
          ))
        )}
        {data.map((d, i) => (
          <text
            key={`t-${i}`}
            x={padX + i * stepX}
            y={h - 4}
            fontSize={11}
            fill="#6b7280"
            textAnchor="middle"
          >
            {d.date}
          </text>
        ))}
      </svg>
    </div>
  );
}

function MiniAreaChart({
  data,
  keys,
  colors,
  height = 240,
}: {
  data: any[];
  keys: string[];
  colors: string[];
  height?: number;
}) {
  const allValues: number[] = [];
  data.forEach((row) => keys.forEach((k) => allValues.push(Number(row[k]))));
  const max = Math.max(...allValues, 1);
  const w = Math.max(520, data.length * 90);
  const h = height;
  const padX = 36;
  const padY = 18;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const stepX = innerW / Math.max(1, data.length - 1);
  const yFor = (v: number) => padY + innerH - (v / max) * innerH;
  const cumulative = new Array(data.length).fill(0);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={padX}
            x2={w - padX}
            y1={padY + innerH * t}
            y2={padY + innerH * t}
            stroke="#eef2f7"
            strokeWidth={1}
          />
        ))}
        {keys.map((k, idx) => {
          const topPts: string[] = [];
          const bottomPts: string[] = [];
          data.forEach((d, i) => {
            const x = padX + i * stepX;
            const bottom = cumulative[i];
            const top = bottom + Number(d[k]);
            bottomPts.unshift(`${x},${yFor(bottom)}`);
            topPts.push(`${x},${yFor(top)}`);
            cumulative[i] = top;
          });
          const polygon = [...topPts, ...bottomPts].join(" ");
          const stroke = colors[idx] ?? "#6b7280";
          return (
            <g key={k}>
              <polygon
                points={polygon}
                fill={stroke}
                opacity={0.12}
                stroke="none"
              />
              <polyline
                points={topPts.join(" ")}
                fill="none"
                stroke={stroke}
                strokeWidth={2}
              />
            </g>
          );
        })}
        {data.map((d, i) => (
          <text
            key={`x-${i}`}
            x={padX + i * stepX}
            y={h - 4}
            fontSize={11}
            fill="#6b7280"
            textAnchor="middle"
          >
            {d.date}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* --- SoilCard: improved badge placement (no overlap) --- */
function SoilCard({
  title,
  kind,
  depths,
  imageSrc = "/images/soil-stack.png",
}: {
  title: string;
  kind: "temperature" | "moisture";
  depths: Depth[];
  imageSrc?: string;
}) {
  const imageWidth = 360;
  const badgeLeft = Math.round(imageWidth * 0.58);
  const startTopPct = 12;
  const stepTopPct = 20;

  return (
    <div className="bg-white rounded-2xl shadow p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        <div className="text-sm text-gray-500">Last updated: 2025-11-16</div>
      </div>

      <div className="flex gap-6 items-start flex-wrap">
        <div
          className="relative flex-shrink-0"
          style={{ width: imageWidth, minWidth: 280 }}
        >
          <img
            src={imageSrc}
            alt="soil stack"
            className="w-full h-auto object-contain"
          />

          {depths.map((d, i) => {
            const topPct = startTopPct + i * stepTopPct;
            const value =
              kind === "temperature"
                ? `${d.temp.toFixed(2)} °C`
                : `${d.moisture.toFixed(1)} %`;
            const bgColor =
              kind === "temperature"
                ? ["#fef08a", "#fcd34d", "#fb923c", "#f97316"][i]
                : ["#99f6e4", "#bbf7d0", "#bfdbfe", "#93c5fd"][i];

            return (
              <div
                key={d.label}
                style={{
                  position: "absolute",
                  top: `${topPct}%`,
                  left: `${Math.round(badgeLeft)}px`,
                  transform: "none",
                  zIndex: 30,
                  pointerEvents: "none",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 8,
                      background: "#9ca3af",
                    }}
                  />
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: bgColor,
                      color: "#042f2e",
                      boxShadow: "0 4px 10px rgba(2,6,23,0.06)",
                    }}
                  >
                    {d.label} : {value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 min-w-[240px]">
          <div className="space-y-3">
            {depths.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-gray-500">
                    {kind === "temperature" ? "Temperature" : "Moisture"} sensor
                  </div>
                </div>

                <div
                  className="text-lg font-semibold text-right"
                  style={{ minWidth: 90 }}
                >
                  {kind === "temperature"
                    ? `${d.temp.toFixed(2)} °C`
                    : `${d.moisture.toFixed(1)} %`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Page --- */
export default function SoilPage() {
  const [selectedFarm, setSelectedFarm] = useState("My Farm 1");

  // location inputs
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [village, setVillage] = useState("");

  // api state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soilStats, setSoilStats] = useState<SoilStats | null>(null);
  const [depths, setDepths] = useState<Depth[]>(DEFAULT_DEPTHS);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  const handleFetchSoil = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSoilStats(null);

    // optional: require at least one field
    if (!country && !stateName && !city && !village) {
      setError("Please enter at least one location field.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (country) params.append("country", country);
      if (stateName) params.append("state", stateName);
      if (city) params.append("city", city);
      if (village) params.append("village", village);

      // 🔁 adjust "/soil" to your actual backend soil route if needed
      const res = await fetch(`${API_BASE_URL}/soil?${params.toString()}`);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          typeof errBody.message === "string"
            ? errBody.message
            : "Failed to fetch soil data";
        throw new Error(msg);
      }

      const raw = await res.json();

      // --- normalize stats ---
      const stats: SoilStats = {
        nitrogen: raw.nitrogen ?? raw.N ?? raw.n,
        phosphorus: raw.phosphorus ?? raw.P ?? raw.p,
        potassium: raw.potassium ?? raw.K ?? raw.k,
        moisture: raw.moisture ?? raw.soilMoisture,
        ph: raw.ph ?? raw.pH,
        ec: raw.ec ?? raw.electricalConductivity ?? raw.EC,
      };
      setSoilStats(stats);

      // --- optional: depth-wise data from backend, if present ---
      if (Array.isArray(raw.depths)) {
        const mapped: Depth[] = raw.depths.map(
          (d: any, idx: number): Depth => ({
            label:
              d.label ??
              d.depth ??
              DEFAULT_DEPTHS[idx]?.label ??
              `Depth ${idx + 1}`,
            temp: Number(d.temp ?? d.temperature ?? DEFAULT_DEPTHS[idx]?.temp ?? 0),
            moisture: Number(
              d.moisture ?? d.moist ?? DEFAULT_DEPTHS[idx]?.moisture ?? 0
            ),
          })
        );
        setDepths(mapped);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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

      {/* location form */}
      <form
        onSubmit={handleFetchSoil}
        className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="India"
            className="border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">State</label>
          <input
            type="text"
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            placeholder="Maharashtra"
            className="border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Akola"
            className="border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Village</label>
          <input
            type="text"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            placeholder="Your village"
            className="border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 md:mt-0 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Fetching..." : "Get Soil Data"}
          </button>
        </div>
      </form>

      {/* error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* soil stats summary */}
      {soilStats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          {soilStats.nitrogen != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Nitrogen (N)</div>
              <div className="text-xl font-semibold">
                {soilStats.nitrogen} kg/ha
              </div>
            </div>
          )}
          {soilStats.phosphorus != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Phosphorus (P)</div>
              <div className="text-xl font-semibold">
                {soilStats.phosphorus} kg/ha
              </div>
            </div>
          )}
          {soilStats.potassium != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Potassium (K)</div>
              <div className="text-xl font-semibold">
                {soilStats.potassium} kg/ha
              </div>
            </div>
          )}
          {soilStats.moisture != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="text-xs text-gray-500">Moisture</div>
              <div className="text-xl font-semibold">
                {soilStats.moisture} %
              </div>
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

      {/* main grid with your original cards + charts */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          <SoilCard
            title="Soil Temperature (°C)"
            kind="temperature"
            depths={depths}
          />
          <SoilCard
            title="Soil Moisture (%)"
            kind="moisture"
            depths={depths}
          />
        </div>

        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 overflow-hidden">
            <h4 className="text-md font-medium mb-3">
              Soil Temperature Forecast (Next 7 Days)
            </h4>
            <div style={{ height: 260 }}>
              <MiniLineChart
                data={TEMP_FORECAST}
                keys={["5 cm", "15 cm", "50 cm", "150 cm"]}
                colors={["#f59e0b", "#fb923c", "#fb7185", "#ef4444"]}
                height={260}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 overflow-hidden">
            <h4 className="text-md font-medium mb-3">
              Soil Moisture Forecast (Next 7 Days)
            </h4>
            <div style={{ height: 300 }}>
              <MiniAreaChart
                data={MOISTURE_FORECAST}
                keys={["5 cm", "15 cm", "50 cm", "150 cm"]}
                colors={["#06b6d4", "#10b981", "#60a5fa", "#3b82f6"]}
                height={300}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
