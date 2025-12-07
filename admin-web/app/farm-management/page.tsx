"use client";
import React, { useMemo, useState } from "react";

const IMAGE_SRC = "/images/static-map.jpg";

type Farm = {
  id: number;
  userName: string;
  farmName: string;
  areaAc: number;
  areaSqm: number;
  readyToHarvest: boolean;
  irrigationRequired: boolean;
  farmScore: number; // 0..100
  pos: { leftPct: number; topPct: number };
};

const SAMPLE_FARMS: Farm[] = [
  { id: 1, userName: "User A", farmName: "My Farm 3", areaAc: 5.87, areaSqm: 23744, readyToHarvest: false, irrigationRequired: false, farmScore: 38.2, pos: { leftPct: 45, topPct: 42 } },
  { id: 2, userName: "User B", farmName: "My Farm 16", areaAc: 2.27, areaSqm: 9193, readyToHarvest: false, irrigationRequired: false, farmScore: 73.3, pos: { leftPct: 47, topPct: 45 } },
  { id: 3, userName: "User C", farmName: "My Farm 15", areaAc: 2.09, areaSqm: 8452, readyToHarvest: false, irrigationRequired: false, farmScore: 45.8, pos: { leftPct: 49, topPct: 48 } },
  { id: 4, userName: "User D", farmName: "My Farm 22", areaAc: 3.5, areaSqm: 14188, readyToHarvest: true, irrigationRequired: true, farmScore: 82.1, pos: { leftPct: 52, topPct: 38 } },
  { id: 5, userName: "User E", farmName: "My Farm 18", areaAc: 0.87, areaSqm: 3522, readyToHarvest: false, irrigationRequired: false, farmScore: 22.0, pos: { leftPct: 41, topPct: 48 } },
];

function KPI({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl shadow border bg-white flex flex-col">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function SmallBadge({ children, color = "bg-green-100 text-green-800" }: { children: React.ReactNode; color?: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{children}</span>;
}

export default function FarmManagementPage() {
  const [farms] = useState<Farm[]>(SAMPLE_FARMS);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "area" | "score">("name");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = farms.filter((f) => f.farmName.toLowerCase().includes(q) || f.userName.toLowerCase().includes(q));
    if (sortKey === "name") arr = arr.sort((a, b) => a.farmName.localeCompare(b.farmName));
    if (sortKey === "area") arr = arr.sort((a, b) => b.areaAc - a.areaAc);
    if (sortKey === "score") arr = arr.sort((a, b) => b.farmScore - a.farmScore);
    return arr;
  }, [farms, search, sortKey]);

  const totals = useMemo(() => {
    return {
      farms: farms.length,
      users: new Set(farms.map((f) => f.userName)).size,
      crops: 3,
      areaAc: farms.reduce((s, f) => s + f.areaAc, 0).toFixed(2),
      harvested: farms.filter((f) => f.readyToHarvest).reduce((s, f) => s + f.areaAc, 0).toFixed(2),
      avgScore: Number((farms.reduce((s, f) => s + f.farmScore, 0) / (farms.length || 1)).toFixed(2)),
    };
  }, [farms]);

  const productivity = useMemo(() => {
    const threshold = totals.avgScore;
    const high = farms.filter((f) => f.farmScore >= threshold).sort((a, b) => b.farmScore - a.farmScore);
    const low = farms.filter((f) => f.farmScore < threshold).sort((a, b) => b.farmScore - a.farmScore);
    return { threshold, high, low };
  }, [farms, totals.avgScore]);

  function downloadCSV(list: Farm[]) {
    const rows = [
      ["User Name", "Farm Name", "Area (ac)", "Area (m2)", "Ready", "Irrigation", "Score"],
      ...list.map((f) => [f.userName, f.farmName, f.areaAc, f.areaSqm, f.readyToHarvest ? "YES" : "NO", f.irrigationRequired ? "YES" : "NO", `${f.farmScore}%`]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farms_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-5 bg-[#F8FAF6] min-h-screen">
      {/* Filters Row */}
      <div className="flex gap-3 items-center mb-4">
        <select className="p-2 rounded-lg bg-white shadow text-sm"><option>India</option></select>
        <select className="p-2 rounded-lg bg-white shadow text-sm"><option>All States</option></select>
        <select className="p-2 rounded-lg bg-white shadow text-sm"><option>All Districts</option></select>
        <select className="p-2 rounded-lg bg-white shadow text-sm"><option>All Villages</option></select>

        <div className="ml-auto flex items-center gap-2">
          <button className="bg-white px-3 py-2 rounded shadow">Reset</button>
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg shadow">Refresh</button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border bg-black" style={{ height: 420 }}>
        <img src={IMAGE_SRC} alt="Map" className="w-full h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none">
          {farms.map((f) => (
            <div key={f.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${f.pos.leftPct}%`, top: `${f.pos.topPct}%` }}>
              <div className="w-4 h-4 bg-yellow-400 border-2 border-white rounded-full shadow" />
            </div>
          ))}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-3">
          <button className="bg-white shadow p-3 rounded-full">+</button>
          <button className="bg-white shadow p-3 rounded-full">−</button>
          <button className="bg-white shadow p-3 rounded-full">🗺️</button>
          <button className="bg-white shadow p-3 rounded-full">🌧️</button>
          <button className="bg-white shadow p-3 rounded-full">⚙️</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4 mt-4">
        <KPI title="Total Farms" value={totals.farms} />
        <KPI title="Total Users" value={totals.users} />
        <KPI title="Total Crops" value={totals.crops} />
        <KPI title="Total Area" value={`${totals.areaAc} ac`} />
        <KPI title="Harvested Area" value={`${totals.harvested} ac`} />
      </div>

      {/* Farm List */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Farm List</h3>
          <div className="flex items-center gap-2">
            <input className="p-2 border rounded-lg" placeholder="Search by farm or user" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} className="p-2 rounded-lg border">
              <option value="name">Sort by Name</option>
              <option value="area">Sort by Area</option>
              <option value="score">Sort by Score</option>
            </select>
            <button onClick={() => downloadCSV(filtered)} className="bg-green-600 text-white px-3 py-2 rounded">Download CSV</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm table-auto">
            <thead className="text-left text-gray-500 bg-white">
              <tr>
                <th className="py-2 px-3 text-left">USER NAME</th>
                <th className="py-2 px-3 text-left">FARM NAME</th>
                <th className="py-2 px-3 text-right">AREA (ac / m²)</th>
                <th className="py-2 px-3 text-center">READY</th>
                <th className="py-2 px-3 text-center">IRRIGATION</th>
                <th className="py-2 px-3 text-right">FARM SCORE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-3">{f.userName}</td>
                  <td className="py-3 px-3 font-medium text-sky-700">{f.farmName}</td>
                  <td className="py-3 px-3 text-right">{f.areaAc} ac / {f.areaSqm.toLocaleString()} m²</td>
                  <td className="py-3 px-3 text-center"><SmallBadge color={f.readyToHarvest ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{f.readyToHarvest ? "YES" : "NO"}</SmallBadge></td>
                  <td className="py-3 px-3 text-center"><SmallBadge color={f.irrigationRequired ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}>{f.irrigationRequired ? "YES" : "NO"}</SmallBadge></td>
                  <td className="py-3 px-3 text-right font-semibold">{f.farmScore.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Productivity Split: High / Low (fixed tables) */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* High-Productive */}
        <div className="bg-white p-5 rounded-xl shadow border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold">High-Productive Farms</h4>
              <div className="text-sm text-gray-500">Score ≥ {productivity.threshold.toFixed(2)} (average)</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold">{productivity.high.length}</div>
              <div className="text-xs text-gray-500">Farms</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: "45%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead className="text-gray-600 border-b bg-white">
                <tr>
                  <th className="py-2 px-2 text-left">Farm</th>
                  <th className="py-2 px-2 text-left">Owner</th>
                  <th className="py-2 px-2 text-right">Area (ac)</th>
                  <th className="py-2 px-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {productivity.high.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-green-50">
                    <td className="py-2 px-2">{f.farmName}</td>
                    <td className="py-2 px-2">{f.userName}</td>
                    <td className="py-2 px-2 text-right">{f.areaAc}</td>
                    <td className="py-2 px-2 text-right font-semibold text-green-700">{f.farmScore.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low-Productive */}
        <div className="bg-white p-5 rounded-xl shadow border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold">Low-Productive Farms</h4>
              <div className="text-sm text-gray-500">Score &lt; {productivity.threshold.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold">{productivity.low.length}</div>
              <div className="text-xs text-gray-500">Farms</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: "45%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead className="text-gray-600 border-b bg-white">
                <tr>
                  <th className="py-2 px-2 text-left">Farm</th>
                  <th className="py-2 px-2 text-left">Owner</th>
                  <th className="py-2 px-2 text-right">Area (ac)</th>
                  <th className="py-2 px-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {productivity.low.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-yellow-50">
                    <td className="py-2 px-2">{f.farmName}</td>
                    <td className="py-2 px-2">{f.userName}</td>
                    <td className="py-2 px-2 text-right">{f.areaAc}</td>
                    <td className="py-2 px-2 text-right font-semibold text-yellow-700">{f.farmScore.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Consider irrigation, soil test or advisory.</span>
            <button onClick={() => downloadCSV(productivity.low)} className="bg-yellow-600 text-white px-3 py-1 rounded">Export Low</button>
          </div>
        </div>
      </div>
    </div>
  );
}
