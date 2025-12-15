"use client";

import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  BookOpen,
  FileText,
  GraduationCap,
  ImageIcon,
  ArrowRight,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:4000";

/* ---------- Nutrient Donut ---------- */
function NutrientDonut({
  label,
  code,
  color,
  value,
}: {
  label: string;
  code: string;
  color: string;
  value?: number;
}) {
  const percent =
    typeof value === "number" ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div className="border rounded-lg p-3 text-center bg-white">
      <svg viewBox="0 0 36 36" className="w-14 h-14 mx-auto">
        <path d="M18 2 a16 16 0 1 1 0 32" fill="none" stroke="#eee" strokeWidth="4" />
        <path
          d="M18 2 a16 16 0 1 1 0 32"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${percent},100`}
        />
        <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="700">
          {code}
        </text>
      </svg>
      <div className="text-xs font-semibold mt-1">{label}</div>
      <div className="text-[11px] text-gray-400">{value ?? "--"}</div>
    </div>
  );
}

export default function SoilPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /* ---------- Fertilizer state ---------- */
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [N, setN] = useState("");
  const [P, setP] = useState("");
  const [K, setK] = useState("");
  const [OC, setOC] = useState("");
  const [fertilizer, setFertilizer] = useState<any>(null);
  const [loadingFert, setLoadingFert] = useState(false);

  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingSoil, setLoadingSoil] = useState(true);

  /* ---------- VALIDATION (FIX #1) ---------- */
  const isFormValid =
    !!state &&
    !!district &&
    !!N &&
    !!P &&
    !!K &&
    !!OC &&
    !loadingFert;

  /* ---------- Load soil + states ---------- */
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingSoil(true);

        const [soilRes, stateRes] = await Promise.all([
          fetch(`${API_BASE}/soil`),
          fetch(`${API_BASE}/locations/states`),
        ]);

        const soilJson = await soilRes.json();
        const stateJson = await stateRes.json();

        setData(soilJson);
        setStates(stateJson);

        if (soilJson?.nutrients) {
          setN(String(soilJson.nutrients.N ?? ""));
          setP(String(soilJson.nutrients.P ?? ""));
          setK(String(soilJson.nutrients.K ?? ""));
          setOC(String(soilJson.nutrients.OC ?? ""));
        }
      } catch {
        setError("Failed to load soil data");
      } finally {
        setLoadingSoil(false);
      }
    }

    loadInitialData();
  }, []);

  /* ---------- Load districts ---------- */
  useEffect(() => {
    if (!state) return;

    fetch(`${API_BASE}/locations/districts?state=${state}`)
      .then((r) => r.json())
      .then(setDistricts);
  }, [state]);

  /* ---------- Fertilizer API ---------- */
  async function getRecommendation() {
    try {
      setLoadingFert(true);

      const res = await fetch(`${API_BASE}/fertilizer/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          district,
          N: Number(N),
          P: Number(P),
          K: Number(K),
          OC: Number(OC),
        }),
      });

      const json = await res.json();
      setFertilizer(json);
    } catch {
      setFertilizer(null);
    } finally {
      setLoadingFert(false);
    }
  }

  const nutrients = data?.nutrients ?? {};
  const forecast7d = data?.forecast7d ?? [];

  const forecastData = {
    labels: forecast7d.map((d: any) => d.date),
    datasets: [
      {
        label: "Temperature (°C)",
        data: forecast7d.map((d: any) => d.temp),
        borderColor: "#ef4444",
        tension: 0.3,
      },
      {
        label: "Moisture (%)",
        data: forecast7d.map((d: any) => d.moist),
        borderColor: "#16a34a",
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="p-5 min-h-screen bg-[#f3f7f6]">

      {/* ================= MITHU TOP STRIP ================= */}
      <div className="bg-white px-6 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-lg">
          <img src="/images/mithu.jpg" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-bold text-green-800">Soil Saathi</div>
            <div className="text-xs text-gray-500">
              Mithu — your soil co-pilot
            </div>
          </div>
        </div>
        <button
          onClick={() => location.reload()}
          className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 mt-2 rounded">
          {error}
        </div>
      )}

      {/* ================= TOP ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-semibold mb-2">Soil Score Card</div>
          <div className="bg-green-50 rounded p-3 text-center">
            <div className="text-xs text-gray-500">Overall Soil Score</div>
            <div className="text-3xl font-bold text-green-700">
              {data?.soilScore ?? "--"}
            </div>
            <button className="mt-2 px-3 py-1 text-xs bg-green-700 text-white rounded">
              Download Soil Health Card
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-semibold mb-2">Field Map / Live View</div>
          <div className="h-[200px] flex items-center justify-center border rounded text-gray-400 text-sm">
            Field Map
          </div>
          <div className="text-[11px] text-gray-400 mt-2">
            Source: Backend • Last: {data?.lastUpdated ?? "--"}
          </div>
        </div>
      </div>

      {/* ================= MAIN ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">

        {/* LEFT: Nutrients */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-semibold mb-3">
            Key Soil Nutrients
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Nitrogen", "N"],
              ["Phosphorus", "P"],
              ["Potassium", "K"],
              ["Organic Carbon", "OC"],
              ["pH", "pH"],
              ["EC", "EC"],
              ["Sulfur", "S"],
              ["Iron", "Fe"],
              ["Zinc", "Zn"],
              ["Copper", "Cu"],
              ["Boron", "B"],
              ["Manganese", "Mn"],
            ].map(([label, code]) => (
              <NutrientDonut
                key={code}
                label={label}
                code={code}
                color="#16a34a"
                value={nutrients[code]}
              />
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">

          {/* Soil Temperature & Moisture */}
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <img src="/images/soil.png" className="w-80 h-90 rounded" />
                <div>
                  <div className="font-semibold text-green-800 text-sm">
                    Soil Temperature
                  </div>
                  <div className="text-xl font-bold mt-1">
                    {data?.temperature ?? "--"} °C
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <img src="/images/soil.png" className="w-80 h-90 rounded" />
                <div>
                  <div className="font-semibold text-blue-700 text-sm">
                    Soil Moisture
                  </div>
                  <div className="text-xl font-bold mt-1">
                    {data?.moisture ?? "--"} %
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forecast + Advisory */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div className="bg-white rounded-lg p-4 shadow">
              <div className="text-sm font-semibold mb-2">
                7-day Forecast
              </div>

              <table className="w-full text-xs border mb-3">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-1 border">Date</th>
                    <th className="p-1 border">Temp</th>
                    <th className="p-1 border">Moist</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast7d.length ? (
                    forecast7d.map((d: any, i: number) => (
                      <tr key={i}>
                        <td className="p-1 border">{d.date}</td>
                        <td className="p-1 border">{d.temp}</td>
                        <td className="p-1 border">{d.moist}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-2 text-center text-gray-400"
                      >
                        No forecast data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="h-[180px]">
                <Line
                  data={forecastData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <div className="text-sm font-semibold mb-2">
                Advisories
              </div>
              <table className="w-full text-xs border">
                <tbody>
                  <tr>
                    <td className="p-2 border w-20">General</td>
                    <td className="p-2 border">
                      {data?.advisory ?? "No advisory currently."}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ================= GOVERNMENT HEADER ================= */}
      {/* (unchanged, preserved exactly as requested) */}
      <div className="bg-white rounded-xl shadow p-4 mt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/images/gov-logo.png" className="h-14" />
          <div>
            <div className="font-bold text-sm">Government of India</div>
            <div className="text-xs">
              Ministry of Agriculture and Farmers Welfare<br />
              Department of Agriculture and Farmers Welfare
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <img src="/images/soil-health-logo.png" className="h-12" />
          <div>
            <div className="font-bold">Soil Health Card</div>
            <div className="text-xs text-gray-500">
              Healthy Earth, Greener Farm
            </div>
          </div>
        </div>
      </div>

      {/* ================= FERTILIZER ================= */}
      <div className="bg-green-50 rounded-xl p-6 shadow border border-green-200 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

          {/* ✅ FIX #2: RESTORED INPUT WRAPPER */}
          <div className="bg-white rounded-lg p-4 border shadow-sm">

            <select className="w-full border rounded px-3 py-2 mb-3" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Select State</option>
              {states.map((s) => <option key={s}>{s}</option>)}
            </select>

            <select className="w-full border rounded px-3 py-2 mb-3" value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!state}>
              <option value="">Select District</option>
              {districts.map((d) => <option key={d}>{d}</option>)}
            </select>

            <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Nitrogen" value={N} onChange={(e) => setN(e.target.value)} />
            <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Phosphorus" value={P} onChange={(e) => setP(e.target.value)} />
            <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Potassium" value={K} onChange={(e) => setK(e.target.value)} />
            <input className="w-full border rounded px-3 py-2 mb-4" placeholder="Organic Carbon" value={OC} onChange={(e) => setOC(e.target.value)} />

            <button
              onClick={getRecommendation}
              disabled={!isFormValid}
              className={`px-4 py-2 border rounded w-full ${
                isFormValid ? "bg-white" : "bg-gray-200 cursor-not-allowed"
              }`}
            >
              {loadingFert ? "Loading..." : "Get Recommendations"}
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Crop</th>
                  <th className="p-2 border">Soil Conditioner</th>
                  <th className="p-2 border">Fertilizer Combination 1</th>
                  <th className="p-2 border">Fertilizer Combination 2</th>
                </tr>
              </thead>
              <tbody>
                {fertilizer ? (
                  <tr>
                    <td className="p-2 border">{fertilizer.crop}</td>
                    <td className="p-2 border">{fertilizer.soilConditioner}</td>
                    <td className="p-2 border">{fertilizer.combo1?.map((c: string, i: number) => <div key={i}>{c}</div>)}</td>
                    <td className="p-2 border">{fertilizer.combo2?.map((c: string, i: number) => <div key={i}>{c}</div>)}</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-400">
                      Click "Get Recommendations" to view fertilizer advice
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* ================= RESOURCES ================= */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Knowledge Material",
              desc: "Explore guides, manuals, and videos to help you adopt sustainable, chemical-free farming practices.",
              icon: BookOpen,
            },
            {
              title: "Guidelines",
              desc: "Access policy documents and instructions to support smooth and effective execution of the mission.",
              icon: FileText,
            },
            {
              title: "Study Material",
              desc: "Download study materials that simplify natural farming methods for easy understanding and implementation.",
              icon: GraduationCap,
            },
            {
              title: "Gallery",
              desc: "1 crore farmers to be trained and made aware of NF practices, with the help of 2 Krishi Sakhis per cluster.",
              icon: ImageIcon,
            },
          ].map((r) => (
            <div
              key={r.title}
              className="bg-white rounded-2xl p-6 shadow flex justify-between items-start"
            >
              <div className="flex gap-4">
                <r.icon className="text-green-700 w-10 h-10" />
                <div>
                  <div className="font-bold">{r.title}</div>
                  <div className="text-sm text-gray-500">{r.desc}</div>
                </div>
              </div>
              <ArrowRight className="text-gray-300" />
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
