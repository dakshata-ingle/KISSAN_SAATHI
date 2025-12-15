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
function NutrientDonut({ label, code, color, value }: any) {
  const percent =
    typeof value === "number" ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div className="border rounded-xl p-4 text-center bg-white">
      <svg viewBox="0 0 36 36" className="w-16 h-16 mx-auto">
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
      <div className="text-sm font-semibold mt-2">{label}</div>
      <div className="text-xs text-gray-400">{value ?? "--"}</div>
    </div>
  );
}

export default function SoilPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const nutrients = data?.nutrients ?? {};
  const forecast7d = data?.forecast7d ?? [];

  const forecastData = {
    labels: forecast7d.map((d: any) => d.date),
    datasets: [
      {
        label: "Temp",
        data: forecast7d.map((d: any) => d.temp),
        borderColor: "#ef4444",
        tension: 0.3,
      },
      {
        label: "Moist",
        data: forecast7d.map((d: any) => d.moist),
        borderColor: "#16a34a",
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f3f7f6] p-6">
      <div className="max-w-7xl mx-auto">

        {/* ================= HEADER (UNCHANGED) ================= */}
        <div className="bg-white px-6 py-3 flex items-center justify-between border-b rounded-lg mb-6">
          <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-lg">
            <img src="/images/mithu.jpg" className="w-10 h-10" />
            <div>
              <div className="font-bold text-green-800">Soil Saathi</div>
              <div className="text-xs text-gray-500">Mithu — your soil co-pilot</div>
            </div>
          </div>
          <button className="bg-green-700 text-white px-4 py-2 rounded text-sm">
            Refresh
          </button>
        </div>

        {/* ================= TOP ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

          {/* LEFT: NUTRIENTS */}
          <div className="bg-white rounded-xl p-5 shadow">
            <h3 className="font-semibold text-sm mb-4">Key Soil Nutrients</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Nitrogen", "N"], ["Phosphorus", "P"], ["Potassium", "K"],
                ["Organic Carbon", "OC"], ["pH", "pH"], ["EC", "EC"],
                ["Sulfur", "S"], ["Iron", "Fe"], ["Zinc", "Zn"],
                ["Copper", "Cu"], ["Boron", "B"], ["Manganese", "Mn"],
              ].map(([l, c]) => (
                <NutrientDonut key={c} label={l} code={c} color="#16a34a" value={nutrients[c]} />
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* FIELD MAP */}
            <div className="bg-white rounded-xl p-5 shadow">
              <h3 className="font-semibold text-sm mb-2">Field Map / Live View</h3>
              <div className="h-[320px] aspect-square border rounded flex items-center justify-center text-gray-400">
                Field Map
              </div>
            </div>

            {/* TEMP & MOISTURE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* TEMPERATURE */}
              <div className="bg-white rounded-xl p-5 shadow space-y-4">
                <div className="flex gap-4">
                  <img src="/images/soil.png" className="w-24 h-24 rounded" />
                  <div>
                    <div className="font-semibold text-green-700 text-sm">Soil Temperature</div>
                    <div className="text-2xl font-bold">{data?.temperature ?? "--"} °C</div>
                  </div>
                </div>

                <div className="h-[180px]">
                  <Line data={forecastData} />
                </div>

                <table className="w-full text-xs border">
                  <tbody>
                    <tr>
                      <td className="p-2 border w-24">Advisory</td>
                      <td className="p-2 border">{data?.tempAdvisory ?? "No advisory"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* MOISTURE */}
              <div className="bg-white rounded-xl p-5 shadow space-y-4">
                <div className="flex gap-4">
                  <img src="/images/soil.png" className="w-24 h-24 rounded" />
                  <div>
                    <div className="font-semibold text-blue-700 text-sm">Soil Moisture</div>
                    <div className="text-2xl font-bold">{data?.moisture ?? "--"} %</div>
                  </div>
                </div>

                <div className="h-[180px]">
                  <Line data={forecastData} />
                </div>

                <table className="w-full text-xs border">
                  <tbody>
                    <tr>
                      <td className="p-2 border w-24">Advisory</td>
                      <td className="p-2 border">{data?.moistAdvisory ?? "No advisory"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* GOVERNMENT + FERTILIZER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="bg-white rounded-xl p-4 shadow flex items-center gap-4">
                <img src="/images/gov-logo.png" className="h-12" />
                <div className="text-xs">
                  <b>Government of India</b><br />
                  Ministry of Agriculture & Farmers Welfare
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-5 shadow border">
                <h3 className="font-semibold text-sm mb-2">Fertilizer Recommendation</h3>
                <p className="text-sm text-gray-600">
                  Based on soil nutrient analysis
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* ================= RESOURCES ================= */}
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-6">Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[BookOpen, FileText, GraduationCap, ImageIcon].map((Icon, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow flex gap-4">
                <Icon className="w-10 h-10 text-green-700" />
                <div>
                  <div className="font-semibold">Resource</div>
                  <div className="text-sm text-gray-500">Description</div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
