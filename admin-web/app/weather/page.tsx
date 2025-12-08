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
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import Mithu, { MithuMood } from "@/app/components/Mithu";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const POLL_INTERVAL = 60_000;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const DEFAULT_LAT = 18.5204;
const DEFAULT_LON = 73.8567;

/* -------------------- Types -------------------- */
type DailyRange = { date: string; min: number; max: number };
type DailySeries = { dates?: string[]; values: number[] };

type WeatherCurrent = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  summary: string;
  lastUpdated?: string;
};

type WeatherAnalysisResponse = {
  location: { name: string; latitude: number | string; longitude: number | string; timezone: string };
  current: WeatherCurrent;
  forecast7d: { temperature: DailyRange[]; precipitation: DailySeries; humidity?: DailySeries };
  history30d: { temperature: DailyRange[]; precipitation: DailySeries; humidity?: DailySeries };
};

/* -------------------- Helpers -------------------- */
function mithuMoodFromSummary(summary?: string): MithuMood {
  if (!summary) return "default";
  const s = summary.toLowerCase();
  if (s.includes("rain") || s.includes("shower") || s.includes("hail")) return "rainy";
  if (s.includes("sun") || s.includes("clear")) return "sunny";
  if (s.includes("hot") || s.includes("heat")) return "hot";
  if (s.includes("wind") || s.includes("breeze")) return "windy";
  if (s.includes("cloud")) return "cloudy";
  return "default";
}

function generateAdvice(data: WeatherAnalysisResponse | null): string {
  if (!data) return "I don't have weather data yet. Click Mithu for tips.";
  const cur = data.current;
  const avg7 = data.forecast7d.temperature.map((d) => (d.min + d.max) / 2);
  const avg7Mean = avg7.length ? avg7.reduce((s, v) => s + v, 0) / avg7.length : null;
  const total7Rain = data.forecast7d.precipitation.values.reduce((s, v) => s + v, 0);
  const avg7Humidity = data.forecast7d.humidity?.values.reduce((s, v) => s + v, 0) ?? 0;

  if (cur.precipitation >= 6) {
    return "Immediate Alert: Heavy rain expected. Protect seedlings and avoid fertilizer application for 24 hours.";
  }
  if (cur.windSpeed >= 10) {
    return "Wind Alert: Strong winds detected. Secure lightweight materials and check greenhouse covers.";
  }
  if ((cur.temperature ?? 0) >= 38) {
    return "Heat Alert: High temperature — increase irrigation during early morning and evening.";
  }
  if (avg7Mean !== null && avg7Mean > (cur.temperature ?? 0) + 3 && total7Rain < 5) {
    return "Prediction: Temperatures rising over next 7 days and low rain — consider earlier irrigation to maintain soil moisture.";
  }
  if (total7Rain >= 20) {
    return "Prediction: Significant rainfall expected this week — delay harvest and ensure drainage.";
  }
  if (cur.humidity < 40 && cur.temperature > 30) {
    return "Tip: Soil moisture is low and it's warm. Consider topping up irrigation to avoid stress.";
  }
  if (avg7Humidity && avg7Humidity / Math.max(1, avg7.length) < 45) {
    return "Prediction: Lower humidity trend ahead — watch for increased evapotranspiration.";
  }

  return "No urgent actions. Monitor trends and follow recommended irrigation schedule. Tap Mithu for specific tips.";
}

/* -------------------- Page -------------------- */
export default function WeatherPage() {
  const [data, setData] = useState<WeatherAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(false);

  // Mithu UI states
  const [showAdvice, setShowAdvice] = useState(false);
  const [adviceText, setAdviceText] = useState("Tap Mithu for advice.");
  const [glideToTrend, setGlideToTrend] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const predictionRef = useRef<HTMLDivElement | null>(null);

  /* initial fetch / geolocation */
  useEffect(() => {
    if (!navigator?.geolocation) {
      fetchWeather();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        fetchWeatherWithCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        fetchWeather();
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* fetching helpers */
  async function fetchWeatherFromBackend() {
    const url = `${API_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let msg = `Backend fetch failed: ${res.status}`;
      try {
        const parsed = JSON.parse(txt);
        if (parsed?.message) msg = parsed.message;
      } catch {}
      throw new Error(msg);
    }
    return (await res.json()) as WeatherAnalysisResponse;
  }

  async function fetchWeatherWithCoords(lat: number, lon: number) {
    try {
      setLoading(true);
      setError(null);
      const url = `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = `Backend fetch failed: ${res.status}`;
        try {
          const parsed = JSON.parse(txt);
          if (parsed?.message) msg = parsed.message;
        } catch {}
        throw new Error(msg);
      }
      const json = (await res.json()) as WeatherAnalysisResponse;
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeather() {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetchWeatherFromBackend();
      setData(resp);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  /* SSE / Polling logic */
  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (realtime) {
      const url = `${API_BASE_URL}/weather/stream?lat=${coords.lat}&lon=${coords.lon}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          setData(parsed?.data ?? parsed);
        } catch {}
      };
      es.onerror = () => {
        try {
          es.close();
        } catch {}
        timerRef.current = setInterval(fetchWeather, POLL_INTERVAL);
      };
    } else {
      timerRef.current = setInterval(fetchWeather, POLL_INTERVAL);
    }

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime, coords]);

  /* Charts building - include humidity */
  const buildPredictionChart = () => {
    if (!data) return null;
    const labels = data.forecast7d.temperature.map((d) => d.date);
    const avg = data.forecast7d.temperature.map((d) => (d.min + d.max) / 2);
    const rain = data.forecast7d.precipitation.values;
    const humidity = data.forecast7d.humidity?.values ?? new Array(labels.length).fill(NaN);
    return {
      labels,
      datasets: [
        { label: "Avg Temp (°C)", data: avg, borderColor: "rgba(34,197,94,0.95)", tension: 0.25, fill: false, yAxisID: "y" },
        { label: "Rain (mm)", data: rain, type: "bar" as const, backgroundColor: "rgba(245,158,11,0.36)", yAxisID: "y1" },
        { label: "Humidity (%)", data: humidity, borderColor: "rgba(14,165,233,0.95)", tension: 0.25, fill: false, yAxisID: "y2" },
      ],
    };
  };

  const buildHistoryChart = () => {
    if (!data) return null;
    const labels = data.history30d.temperature.map((d) => d.date);
    const avg = data.history30d.temperature.map((d) => (d.min + d.max) / 2);
    const rain = data.history30d.precipitation.values;
    const humidity = data.history30d.humidity?.values ?? new Array(labels.length).fill(NaN);
    return {
      labels,
      datasets: [
        { label: "Avg Temp (°C)", data: avg, borderColor: "rgba(34,197,94,0.95)", tension: 0.25, fill: false, yAxisID: "y" },
        { label: "Rain (mm)", data: rain, type: "bar" as const, backgroundColor: "rgba(245,158,11,0.28)", yAxisID: "y1" },
        { label: "Humidity (%)", data: humidity, borderColor: "rgba(14,165,233,0.95)", tension: 0.25, fill: false, yAxisID: "y2" },
      ],
    };
  };

  const predictionChart = buildPredictionChart();
  const historyChart = buildHistoryChart();

  const coordsLabel = data
    ? `${Number(data.location.latitude ?? coords.lat).toFixed(2)}, ${Number(data.location.longitude ?? coords.lon).toFixed(2)}`
    : `${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`;

  /* Mithu click handler */
  function onMithuClick() {
    const adv = generateAdvice(data);
    setAdviceText(adv);
    setShowAdvice(true);

    // trigger horizontal glide; then scroll to trends
    setGlideToTrend(true);
    setTimeout(() => {
      predictionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setGlideToTrend(false);
    }, 900);
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Weather Dashboard</div>
          <div className="text-xs text-gray-500">Predictions & trends — Mithu guides you</div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Realtime</span>
          <button
            onClick={() => setRealtime((r) => !r)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transform transition ${realtime ? "bg-emerald-600 text-white shadow-lg" : "bg-gray-200 text-gray-700 hover:scale-105"}`}
          >
            {realtime ? "ON" : "OFF"}
          </button>

          <button onClick={fetchWeather} disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded-full shadow hover:scale-105 transition">
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">{error}</div>}

      {/* Current + Mithu */}
      <section className="bg-white rounded-2xl shadow p-6 mb-6 group hover:shadow-2xl transform-gpu hover:scale-[1.007] transition-all">
        <div className="flex gap-6 items-center">
          <div className="w-36 h-36 rounded-xl flex flex-col items-center justify-center text-white" style={{ background: "linear-gradient(90deg,#16a34a,#059669)" }}>
            <div className="text-4xl font-bold">{data ? Math.round(data.current.temperature) : "--"}°C</div>
            <div className="text-sm opacity-90">{data?.current?.summary ?? "—"}</div>
          </div>

          <div className="flex-1 grid grid-cols-6 gap-4 items-center">
            <div className="col-span-3">
              <div className="text-xl font-semibold">{data?.location?.name ?? "—"}</div>
              <div className="text-gray-500 text-sm mb-2">Timezone: {data?.location?.timezone ?? "—"}</div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 rounded-lg shadow-sm border-l-4 border-emerald-500 bg-emerald-50">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Humidity</div>
                      <div className="font-semibold">{data ? `${data.current.humidity}%` : "--"}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg shadow-sm border-l-4 border-sky-400 bg-sky-50">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Wind</div>
                      <div className="font-semibold">{data ? `${data.current.windSpeed} m/s` : "--"}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg shadow-sm border-l-4 border-amber-500 bg-amber-50">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Precipitation</div>
                      <div className="font-semibold">{data ? `${data.current.precipitation} mm` : "--"}</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg shadow-sm border-l-4 border-stone-400 bg-stone-50">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Coords</div>
                      <div className="font-semibold">{coordsLabel}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-3">Last updated: {data?.current?.lastUpdated ? new Date(data.current.lastUpdated).toLocaleString() : "—"}</div>
            </div>

            {/* Mithu on the right */}
            <div className="col-span-3 flex items-center justify-center">
              <div className="relative">
                <Mithu
                  mood={mithuMoodFromSummary(data?.current?.summary)}
                  loop={true}
                  onClick={onMithuClick}
                  advice={adviceText}
                  showAdvice={showAdvice}
                  glide={glideToTrend}
                  size={160}
                />

                <div className="mt-2 text-center text-sm text-gray-600">Tap Mithu — he will guide you</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prediction (anchor ref used by Mithu navigation) */}
      <section ref={predictionRef} className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-6 bg-white p-4 rounded-2xl shadow hover:shadow-lg transition-transform hover:scale-105">
          <div className="font-semibold text-lg mb-2">7-Day Prediction</div>

          <table className="w-full text-sm border rounded-xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-center">Min</th>
                <th className="p-2 text-center">Max</th>
                <th className="p-2 text-center">Rain</th>
                <th className="p-2 text-center">Humidity</th>
              </tr>
            </thead>
            <tbody>
              {data?.forecast7d.temperature.map((d, i) => (
                <tr key={i} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="p-2">{d.date}</td>
                  <td className="p-2 text-center">{d.min}</td>
                  <td className="p-2 text-center">{d.max}</td>
                  <td className="p-2 text-center">{data.forecast7d.precipitation.values[i]}</td>
                  <td className="p-2 text-center">{data.forecast7d.humidity?.values?.[i] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="col-span-12 lg:col-span-6 bg-white p-4 rounded-2xl shadow hover:shadow-lg transition-transform hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-lg">7-Day Prediction Trend</div>
            <div className="text-sm text-gray-500">Average Temp • Rain • Humidity</div>
          </div>

          <div style={{ height: 300 }}>
            {predictionChart ? (
              <Line
                data={predictionChart as any}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  interaction: { mode: "index", intersect: false },
                  scales: {
                    y: { title: { display: true, text: "Avg Temp (°C)" } },
                    y1: { title: { display: true, text: "Rain (mm)" }, position: "right", grid: { drawOnChartArea: false } },
                    y2: { title: { display: true, text: "Humidity (%)" }, position: "right", grid: { drawOnChartArea: false }, display: true },
                  },
                }}
              />
            ) : (
              <div className="text-center text-gray-400">Chart unavailable</div>
            )}
          </div>
        </div>
      </section>

      {/* 30-Day History */}
      <section className="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition-transform hover:scale-105">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-lg">30-Day Average Trend</div>
          <div className="text-sm text-gray-500">Avg Temp • Rain • Humidity</div>
        </div>

        <div style={{ height: 300 }}>
          {historyChart ? (
            <Line
              data={historyChart as any}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                scales: {
                  y: { title: { display: true, text: "Avg Temp (°C)" } },
                  y1: { display: false, position: "right" },
                  y2: { title: { display: true, text: "Humidity (%)" }, position: "right", grid: { drawOnChartArea: false }, display: true },
                },
              }}
            />
          ) : (
            <div className="text-gray-400 text-center">No data</div>
          )}
        </div>
      </section>

      {/* small animations styles */}
      <style>{`
        .mithu-glide { animation: mithuGlide 0.9s cubic-bezier(.2,.9,.2,1) forwards; }
        @keyframes mithuGlide { 0% { transform: translateX(0) } 60% { transform: translateX(160px) } 100% { transform: translateX(220px) } }
        @media (max-width: 1024px) {
          .mithu-glide { transform: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}
