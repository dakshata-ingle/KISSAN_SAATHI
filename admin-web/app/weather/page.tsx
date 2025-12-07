// app/weather/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const POLL_INTERVAL = 60_000;

// Same base URL you used for soil
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

type DailyRange = {
  date: string;
  min: number;
  max: number;
};

type DailySeries = {
  dates: string[];
  values: number[];
};

type WeatherCurrent = {
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // m/s
  precipitation: number; // mm
  summary: string;
};

type WeatherAnalysisResponse = {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: WeatherCurrent;
  forecast7d: {
    temperature: DailyRange[];
    precipitation: DailySeries;
  };
  history30d: {
    temperature: DailyRange[];
    precipitation: DailySeries;
  };
};

export default function WeatherPage() {
  const [data, setData] = useState<WeatherAnalysisResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Location fields (what user types)
  const [country, setCountry] = useState("India");
  const [stateName, setStateName] = useState("Maharashtra");
  const [city, setCity] = useState("Pune");
  const [village, setVillage] = useState("");

  const locationLabel =
    data?.location?.name ||
    [village, city, stateName, country].filter(Boolean).join(", ");

  // ---------- Backend call (location only) ----------
  async function fetchWeatherFromBackend() {
    const params = new URLSearchParams();
    if (country) params.append("country", country);
    if (stateName) params.append("state", stateName);
    if (city) params.append("city", city);
    if (village) params.append("village", village);

    const url = `${API_BASE_URL}/weather?${params.toString()}`;
    console.log("Weather URL =>", url);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Backend weather error body:", text);
      let msg = `Backend weather fetch failed: ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.message) msg = parsed.message;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(msg);
    }

    const json = (await res.json()) as WeatherAnalysisResponse;
    return json;
  }

  async function fetchWeather() {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetchWeatherFromBackend();
      setData(resp);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch + polling
  useEffect(() => {
    fetchWeather();
    timerRef.current = setInterval(() => fetchWeather(), POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Chart builders ----------

  const buildForecastChart = () => {
    if (!data) return null;
    const temp = data.forecast7d.temperature;
    const precip = data.forecast7d.precipitation;

    const labels = temp.map((d) => d.date);
    const max = temp.map((d) => d.max);
    const min = temp.map((d) => d.min);
    const rain = precip.values;

    return {
      labels,
      datasets: [
        {
          label: "Max (°C)",
          data: max,
          borderColor: "rgba(12, 82, 177, 0.95)",
          tension: 0.25,
          fill: false,
        },
        {
          label: "Min (°C)",
          data: min,
          borderColor: "rgba(47, 179, 74, 0.95)",
          tension: 0.25,
          fill: false,
        },
        {
          label: "Rain (mm)",
          data: rain,
          type: "bar" as const,
          backgroundColor: "rgba(6, 182, 212, 0.4)",
        },
      ],
    };
  };

  const buildHistoryChart = () => {
    if (!data) return null;
    const temp = data.history30d.temperature;
    const precip = data.history30d.precipitation;

    const labels = temp.map((d) => d.date);
    const avg = temp.map((d) => (d.min + d.max) / 2);
    const rain = precip.values;

    return {
      labels,
      datasets: [
        {
          label: "Avg Temp (°C)",
          data: avg,
          borderColor: "rgba(37, 99, 235, 0.95)",
          tension: 0.25,
          fill: false,
        },
        {
          label: "Rain (mm)",
          data: rain,
          type: "bar" as const,
          backgroundColor: "rgba(56, 189, 248, 0.4)",
        },
      ],
    };
  };

  const forecastChart = buildForecastChart();
  const historyChart = buildHistoryChart();

  const headerGradient = {
    background: "linear-gradient(90deg,#2fb34a,#1e63d6)",
  };
  const accentGradient = {
    background: "linear-gradient(90deg,#22c55e,#2563eb)",
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <header className="mb-6 rounded-lg shadow-sm" style={headerGradient}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/20 flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className="mix-blend-screen"
              >
                <path
                  d="M3 12c0 4.418 3.582 8 8 8"
                  stroke="#fff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 3c0 4.418-3.582 8-8 8"
                  stroke="#fff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-lg">Weather</div>
              <div className="text-white text-xs opacity-80">
                Weather Analysis (backend: forecast + history)
              </div>
            </div>
          </div>

          {/* Location controls */}
          <div className="flex flex-wrap items-end gap-3 bg-white/10 rounded-xl px-4 py-3">
            <div className="flex flex-col">
              <label className="text-[11px] text-white/80 mb-1">Country</label>
              <input
                className="rounded-md px-2 py-1 text-xs outline-none border border-white/40 bg-white/80"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[11px] text-white/80 mb-1">State</label>
              <input
                className="rounded-md px-2 py-1 text-xs outline-none border border-white/40 bg-white/80"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="Maharashtra"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[11px] text-white/80 mb-1">City</label>
              <input
                className="rounded-md px-2 py-1 text-xs outline-none border border-white/40 bg-white/80"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Pune"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[11px] text-white/80 mb-1">
                Village (optional)
              </label>
              <input
                className="rounded-md px-2 py-1 text-xs outline-none border border-white/40 bg-white/80"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder=""
              />
            </div>

            <button
              onClick={fetchWeather}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white text-xs md:text-sm font-semibold shadow hover:scale-[0.995] disabled:opacity-60"
              title="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12a9 9 0 10-3.85 7.01"
                  stroke="#0f172a"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 3v6h-6"
                  stroke="#0f172a"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="rounded-md bg-red-50 border border-red-100 p-3 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto space-y-6">
        {/* Top cards: current + short advisory */}
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-start gap-6">
                <div
                  className="w-36 h-36 rounded-xl flex flex-col items-center justify-center"
                  style={accentGradient}
                >
                  <div className="text-white text-4xl font-bold">
                    {data ? Math.round(data.current.temperature) : "--"}°C
                  </div>
                  <div className="text-white/90 text-sm mt-1">
                    {data?.current?.summary || "—"}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">
                        Current Weather
                      </div>
                      <div className="text-2xl font-semibold text-slate-800">
                        {data
                          ? `${data.current.temperature.toFixed(1)}°C`
                          : "Loading"}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Timezone:{" "}
                        {data?.location?.timezone || "—"}
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 text-right">
                      <div className="font-medium">
                        {locationLabel || "Select location"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Backend Weather Service
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Stat
                      title="Humidity"
                      value={
                        data
                          ? `${data.current.humidity.toFixed(0)}%`
                          : "--"
                      }
                      icon="humidity"
                    />
                    <Stat
                      title="Wind Speed"
                      value={
                        data
                          ? `${data.current.windSpeed.toFixed(1)} m/s`
                          : "--"
                      }
                      icon="wind"
                    />
                    <Stat
                      title="Precipitation"
                      value={
                        data
                          ? `${data.current.precipitation.toFixed(1)} mm`
                          : "--"
                      }
                      icon="rain"
                    />
                    <Stat
                      title="Coords"
                      value={
                        data
                          ? `${data.location.latitude.toFixed(
                              2
                            )}, ${data.location.longitude.toFixed(2)}`
                          : "--"
                      }
                      icon="gauge"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-white rounded-2xl shadow p-4">
              <div className="text-sm font-semibold mb-2">
                Quick Advisory
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use 7-day forecast for irrigation planning.</li>
                <li>• Watch 30-day trend to adjust crop schedule.</li>
                <li>• Data powered by backend weather analysis.</li>
              </ul>
            </div>
          </div>

          {/* Right column: 7-day forecast table + chart */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-2xl shadow p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">
                  7-Day Forecast (Daily)
                </h3>
                <div className="text-xs text-gray-500">
                  Min / Max temperature & rain
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-center">Min (°C)</th>
                      <th className="p-3 text-center">Max (°C)</th>
                      <th className="p-3 text-center">Rain (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.forecast7d.temperature.map((d, idx) => (
                      <tr
                        key={d.date}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                      >
                        <td className="p-3">
                          <div className="font-medium">{d.date}</div>
                        </td>
                        <td className="p-3 text-center">
                          {d.min.toFixed(1)}
                        </td>
                        <td className="p-3 text-center">
                          {d.max.toFixed(1)}
                        </td>
                        <td className="p-3 text-center">
                          {data.forecast7d.precipitation.values[
                            idx
                          ]?.toFixed(1) ?? "0.0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">7-Day Trend</h3>
                <div className="text-xs text-gray-500">
                  Max/Min Temperature & Rain
                </div>
              </div>

              <div style={{ height: 320 }}>
                {forecastChart ? (
                  <Line
                    data={forecastChart as any}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: "index", intersect: false },
                      plugins: { legend: { position: "bottom" } },
                      scales: {
                        y: {
                          type: "linear",
                          position: "left",
                          title: {
                            display: true,
                            text: "Temperature (°C)",
                          },
                        },
                        y1: {
                          type: "linear",
                          position: "right",
                          grid: { drawOnChartArea: false },
                          title: { display: true, text: "Rain (mm)" },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    Chart not available
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 30-day history */}
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">30-Day History</h3>
            <div className="text-xs text-gray-500">
              Avg Temperature & Rain
            </div>
          </div>

          <div style={{ height: 320 }}>
            {historyChart ? (
              <Line
                data={historyChart as any}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    y: {
                      type: "linear",
                      position: "left",
                      title: {
                        display: true,
                        text: "Avg Temp (°C)",
                      },
                    },
                    y1: {
                      type: "linear",
                      position: "right",
                      grid: { drawOnChartArea: false },
                      title: { display: true, text: "Rain (mm)" },
                    },
                  },
                }}
              />
            ) : (
              <div className="p-6 text-center text-gray-500">
                Chart not available
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* --------------------------------------------------------------
   Small UI components
   -------------------------------------------------------------- */

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value?: string | number;
  icon?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-gradient-to-r from-green-200 to-blue-200">
        {icon === "humidity" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2s5 5.5 5 9a5 5 0 11-10 0c0-3.5 5-9 5-9z"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {icon === "wind" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 12h13a3 3 0 100-6 3 3 0 100 6H3"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {icon === "rain" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 16.5A5.5 5.5 0 0014 11a5 5 0 00-9.9 1"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 19v1M12 19v3M16 19v2"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {icon === "gauge" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v6"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 12a9 9 0 10-18 0"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div>
        <div className="text-xs text-gray-400">{title}</div>
        <div className="text-sm font-semibold text-slate-800">
          {value ?? "--"}
        </div>
      </div>
    </div>
  );
}

function FooterCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-400">{title}</div>
        <div className="text-sm font-semibold text-slate-800">{value}</div>
      </div>
      <div className="text-2xl text-green-500">•</div>
    </div>
  );
}
