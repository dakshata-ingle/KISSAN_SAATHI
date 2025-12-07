// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
} from "recharts";

/**
 * DashboardClient.tsx
 * - Drop-in client component for /dashboard
 * - Uses Tailwind and Recharts (install recharts in admin-web)
 * - Put farm map image at public/map-placeholder.png
 */

/* -------------------- Mock data (replace with API) -------------------- */
const farms = ["Tatva Farm 1", "Tatva Farm 2"];
const defaultFarm = farms[0];

const kpiData: Record<string, any> = {
  "Tatva Farm 1": {
    cropName: "Chili",
    totalAreaAc: 1.14,
    totalAreaM2: 4622.94,
    plantHealthValue: 0.46,
    cropStatus: "Moderate",
    currentYieldEstimate: 0.8,
    waterRequired: 0,
    waterAvailable: 11442,
  },
  "Tatva Farm 2": {
    cropName: "Chili",
    totalAreaAc: 1.08,
    totalAreaM2: 4376.53,
    plantHealthValue: 0.55,
    cropStatus: "Healthy",
    currentYieldEstimate: 0.8,
    waterRequired: 0,
    waterAvailable: 10511,
  },
};

const plantHealthSplit = [
  { name: "Open Soil/Bare", value: 0 },
  { name: "Low Vegetation/Stress", value: 0 },
  { name: "Moderate Vegetation", value: 12.9 },
  { name: "Healthy to Dense Vegetation", value: 75.8 },
  { name: "Very Dense Vegetation", value: 11.3 },
];

const performanceData = [
  { month: "Jan", val: 0.38 },
  { month: "Feb", val: 0.28 },
  { month: "Mar", val: 0.30 },
  { month: "Apr", val: 0.32 },
  { month: "May", val: 0.34 },
  { month: "Jun", val: 0.41 },
  { month: "Jul", val: 0.50 },
  { month: "Aug", val: 0.60 },
  { month: "Sep", val: 0.75 },
  { month: "Oct", val: 0.68 },
  { month: "Nov", val: 0.0 },
  { month: "Dec", val: 0.0 },
];

const yieldData = [
  { month: "Jan", val: 0.279 },
  { month: "Feb", val: 0.22 },
  { month: "Mar", val: 0.24 },
  { month: "Apr", val: 0.25 },
  { month: "May", val: 0.28 },
  { month: "Jun", val: 0.30 },
  { month: "Jul", val: 0.35 },
  { month: "Aug", val: 0.45 },
  { month: "Sep", val: 0.50 },
  { month: "Oct", val: 0.48 },
  { month: "Nov", val: 0.0 },
  { month: "Dec", val: 0.0 },
];

const PH_COLORS = ["#ef4444", "#f97316", "#fbbf24", "#86efac", "#15803d"];

/* -------------------- Component -------------------- */
export default function DashboardClient() {
  const [selectedFarm, setSelectedFarm] = useState<string>(defaultFarm);
  const [selectedIndex, setSelectedIndex] = useState<string>("Plant Health");

  const kpi = useMemo(() => kpiData[selectedFarm], [selectedFarm]);

  const irrigationNeeded = kpi.waterRequired > kpi.waterAvailable;
  const maxWater = Math.max(kpi.waterRequired, kpi.waterAvailable, 1);
  const waterRequiredPct = Math.round((kpi.waterRequired / maxWater) * 100);
  const waterAvailablePct = Math.round((kpi.waterAvailable / maxWater) * 100);

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Top selectors */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Primary operational view for selected farm</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-600">Farm</label>
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="px-3 py-2 rounded-full border bg-white"
          >
            {farms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <label className="text-xs text-slate-600">Satellite</label>
          <select className="px-3 py-2 rounded-full border bg-white">
            <option>S1</option>
            <option>S2</option>
          </select>

          <label className="text-xs text-slate-600">Index</label>
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(e.target.value)}
            className="px-3 py-2 rounded-full border bg-white outline-emerald-300"
          >
            <option>Plant Health</option>
            <option>NDVI</option>
            <option>Moisture</option>
          </select>
        </div>
      </div>

      {/* Map preview (big) */}
      <div className="bg-white rounded-xl shadow p-4 border">
        <div className="relative rounded-lg overflow-hidden" style={{ height: 520 }}>
          <Image
            src="/map-placeholder.png"
            alt="Farm"
            fill
            style={{ objectFit: "cover" }}
            className="rounded-lg"
            sizes="(max-width: 1400px) 100vw, 1400px"
          />

          {/* polygon + markers overlay via svg (static look) */}
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              {/* sample polygon path (adjust later from real geo coords) */}
              <path
                d="M20 15 L38 9 L60 22 L70 26 L86 34 L82 50 L65 55 L48 48 L32 40 Z"
                fill="rgba(34,197,94,0.38)"
                stroke="#FCD34D"
                strokeWidth={0.8}
              />
              {/* markers */}
              <g transform="translate(64,37)">
                <circle cx="0" cy="0" r="2.6" fill="#F59E0B" stroke="#fff" strokeWidth={0.2} />
              </g>
              <g transform="translate(68,42)">
                <circle cx="0" cy="0" r="2.6" fill="#10B981" stroke="#fff" strokeWidth={0.2} />
              </g>
              <g transform="translate(58,36)">
                <circle cx="0" cy="0" r="2.6" fill="#F59E0B" stroke="#fff" strokeWidth={0.2} />
              </g>
            </svg>
          </div>

          {/* bottom chips */}
          <div className="absolute left-4 right-4 bottom-4 flex items-center gap-3">
            <button className="bg-white/90 text-slate-700 px-3 py-1 rounded-md shadow">Legends</button>
            <div className="flex-1 overflow-x-auto">
              <div className="inline-flex gap-2 py-1">
                {["03-Nov-2025", "01-Nov-2025", "27-Oct-2025", "22-Oct-2025", "17-Oct-2025", "14-Oct-2025"].map(
                  (d, i) => (
                    <div
                      key={d}
                      className={`px-3 py-1 rounded-full border ${
                        i === 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      {d}
                    </div>
                  )
                )}
              </div>
            </div>
            <button className="bg-white/90 px-2 py-1 rounded-md shadow">›</button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Crop Name" value={kpi.cropName} icon="🌾" />
        <KpiCard title="Total Farm Area" value={`${kpi.totalAreaAc} ac / ${kpi.totalAreaM2} m²`} icon="📐" />
        <KpiCard title="Plant Health Value" value={kpi.plantHealthValue} icon="🧪" />
        <KpiCard title="Crop Status" value={kpi.cropStatus} icon="🌱" />
        <KpiCard title="Current Yield Estimate" value={`${kpi.currentYieldEstimate} tons/ac`} icon="📈" />
      </div>

      {/* two-column main area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left large column (split + hist) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-4 bg-white rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Plant Health Split</h3>
              <div className="text-xs text-slate-500">{selectedIndex}</div>
            </div>

            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plantHealthSplit} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Bar dataKey="value" barSize={36} label={{ position: "top", formatter: (v: any) => `${v}%` }}>
                    {plantHealthSplit.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={PH_COLORS[idx % PH_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
                {plantHealthSplit.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ background: PH_COLORS[i % PH_COLORS.length] }} />
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* historical charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Last 5 year Farm Performance</h4>
                <div className="flex gap-2">
                  {["2021", "2022", "2023", "2024", "2025"].map((y) => (
                    <span key={y} className={`px-3 py-1 rounded-md text-sm ${y === "2025" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200"}`}>
                      {y}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="val" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Last 5 year Yield</h4>
                <div className="flex gap-2">
                  {["2021", "2022", "2023", "2024", "2025"].map((y) => (
                    <span key={y} className={`px-3 py-1 rounded-md text-sm ${y === "2025" ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200"}`}>
                      {y}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yieldData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => `${v} tons/ac`} />
                    <Bar dataKey="val" fill="#16A34A" barSize={18} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* right column: watering guide */}
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Watering Guide <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">AI</span></h3>
              <div className="text-xs text-slate-500">Status</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-3 gap-3">
                <SmallStat label="Irrigation Required" value={irrigationNeeded ? "Yes" : "No"} highlight={!irrigationNeeded ? "green" : "red"} />
                <SmallStat label="Water Required" value={`${kpi.waterRequired} L`} />
                <SmallStat label="Water Available" value={`${fmt(kpi.waterAvailable)} L`} />
              </div>

              <div className="mt-4 flex items-center justify-center gap-6">
                <CircularGauge value={kpi.waterRequired} label="Water Required" pct={waterRequiredPct} colorClass="from-rose-400 to-rose-600" />
                <CircularGauge value={kpi.waterAvailable} label="Water Available" pct={waterAvailablePct} colorClass="from-sky-400 to-sky-600" />
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg shadow border text-sm text-slate-600">
            Tip: Connect farm telemetry & local reservoir data to keep the AI watering guide accurate.
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Small UI parts -------------------- */

function KpiCard({ title, value, icon }: { title: string; value: string | number; icon?: string }) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-2xl">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="font-semibold text-lg text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function SmallStat({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "green" }) {
  return (
    <div className="p-3 bg-white rounded-lg shadow-sm border flex items-center gap-3 text-sm">
      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">💧</div>
      <div className="flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`font-semibold ${highlight === "green" ? "text-emerald-600" : highlight === "red" ? "text-rose-600" : "text-slate-800"}`}>{value}</div>
      </div>
    </div>
  );
}

function CircularGauge({ value, label, pct, colorClass }: { value: number; label: string; pct: number; colorClass?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-40 h-40 rounded-full bg-white shadow-inner flex items-center justify-center border-4 border-slate-100 relative overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl font-bold text-sky-700">{value} L</div>
        </div>

        {/* decorative wave. simple svg */}
        <svg className="absolute bottom-0" viewBox="0 0 200 40" width="200" height="40" preserveAspectRatio="none">
          <path d={`M0 20 Q 50 ${20 - pct / 6} 100 20 T200 20 V40 H0 Z`} fill="rgba(6,78,217,0.06)" />
        </svg>
      </div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
    </div>
  );
}
