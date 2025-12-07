// app/market/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

/**
 * Market Rates page (single-file)
 * - Place at: app/market/page.tsx
 * - Fixes hydration errors by ensuring all variable data (Date/Math.random/etc.)
 *   is created only on the client (inside useEffect).
 */

/* Types */
type MarketRow = {
  id: string;
  state: string;
  market: string;
  commodity: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  history: number[];
};

const COMMODITIES = ["Amaranthus", "Wheat", "Rice", "Maize", "Mustard"];
const STATES = ["Kerala", "Punjab", "Maharashtra", "Karnataka", "Rajasthan"];

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
const uid = (prefix = "") =>
  prefix + Math.random().toString(36).slice(2, 9);

/* NOTE: initialMarkets is left deterministic-looking but we call it only on the client */
const initialMarkets = (): MarketRow[] => {
  const rows: MarketRow[] = [
    ["Kerala", "Cherthala", "Amaranthus", 6000, 6200, 6100],
    ["Kerala", "Harippad", "Amaranthus", 5000, 5600, 5000],
    ["Kerala", "Pampady", "Amaranthus", 3000, 4500, 4000],
    ["Punjab", "Ludhiana", "Wheat", 17000, 18000, 17500],
    ["Maharashtra", "Pune", "Rice", 14000, 15000, 14500],
  ].map(([state, market, commodity, minP, maxP, modalP]) => ({
    id: uid("m-"),
    state: state as string,
    market: market as string,
    commodity: commodity as string,
    arrivalDate: new Date().toISOString().slice(0, 10),
    minPrice: Number(minP),
    maxPrice: Number(maxP),
    modalPrice: Number(modalP),
    history: Array.from({ length: 10 }).map((_, i) =>
      Number(modalP) - (9 - i) * Math.round(Math.random() * 50)
    ),
  }));
  return rows;
};

/* Sparkline - client-only rendering (safe once data is client-only) */
function Sparkline({
  values,
  width = 120,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const last = values[values.length - 1];
  const up = last >= values[values.length - 2];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={up ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MarketPage() {
  /* Important: start with empty data on first render (server) to avoid SSR mismatch.
     Populate real mock data on client in useEffect. */
  const [data, setData] = useState<MarketRow[]>([]);
  const [commodity, setCommodity] = useState<string>("Amaranthus");
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<
    "modalPrice" | "minPrice" | "maxPrice"
  >("modalPrice");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const tickRef = useRef<number>(0);

  /* clientTime is set only on client — avoids server/client string mismatch */
  const [clientTime, setClientTime] = useState<string>("");

  /* Initialize mock data on client only */
  useEffect(() => {
    // populate initial mock markets (runs only in browser)
    setData(initialMarkets());
    setSelectedMarketId(null);

    // set clientTime and keep it ticking every second
    setClientTime(new Date().toLocaleTimeString());
    const tInterval = setInterval(() => {
      setClientTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(tInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Simulate realtime updates client-side */
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((r) => {
          const base = r.modalPrice;
          const drift = (Math.random() - 0.5) * 80; // +/- 40
          const newModal = Math.max(50, Math.round(base + drift));
          const newMin = Math.max(
            10,
            Math.min(r.minPrice + Math.round((Math.random() - 0.5) * 20), newModal)
          );
          const newMax = Math.max(
            newModal,
            Math.max(r.maxPrice + Math.round((Math.random() - 0.5) * 30), newModal)
          );
          const newHistory = [...r.history.slice(-8), newModal];
          return {
            ...r,
            modalPrice: newModal,
            minPrice: newMin,
            maxPrice: newMax,
            history: newHistory,
            arrivalDate: new Date().toISOString().slice(0, 10),
          };
        })
      );
      tickRef.current++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* Derived list with filters and sort */
  const filtered = useMemo(() => {
    const s = data.filter((r) => {
      if (commodity && r.commodity !== commodity) return false;
      if (stateFilter !== "All" && r.state !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(
            r.market.toLowerCase().includes(q) ||
            r.state.toLowerCase().includes(q)
          )
        )
          return false;
      }
      return true;
    });
    const sorted = [...s].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [data, commodity, stateFilter, search, sortKey, sortDir]);

  useEffect(() => {
    // adjust selected after filters applied
    if (!selectedMarketId && filtered.length) setSelectedMarketId(filtered[0].id);
    if (selectedMarketId && !filtered.find((r) => r.id === selectedMarketId)) {
      setSelectedMarketId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedMarketId]);

  const selected = filtered.find((r) => r.id === selectedMarketId) ?? filtered[0];

  function addRandomMarket() {
    const st = STATES[Math.floor(Math.random() * STATES.length)];
    const mk = "Market " + Math.floor(Math.random() * 1000);
    const com = COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
    const modal = Math.round(3000 + Math.random() * 17000);
    const newRow: MarketRow = {
      id: uid("m-"),
      state: st,
      market: mk,
      commodity: com,
      arrivalDate: new Date().toISOString().slice(0, 10),
      minPrice: Math.round(modal - Math.random() * 700),
      maxPrice: Math.round(modal + Math.random() * 700),
      modalPrice: modal,
      history: Array.from({ length: 10 }).map((_, i) =>
        modal - Math.round((9 - i) * (Math.random() * 60))
      ),
    };
    setData((d) => [newRow, ...d]);
    setSelectedMarketId(newRow.id);
  }

  function resetData() {
    setData(initialMarkets());
    setSelectedMarketId(null);
  }

  function PriceBar({ value, max = 20000 }: { value: number; max?: number }) {
    const pct = Math.min(1, value / max);
    return (
      <div className="w-full h-48 bg-gray-50 rounded shadow-inner flex items-end p-3">
        <div className="w-full rounded bg-white border h-full flex items-end">
          <div className="mx-auto w-36 text-center">
            <div className="h-2 bg-gray-100 rounded mb-2"></div>
            <div className="relative h-36 flex items-end">
              <div
                className="mx-auto w-20 rounded-t-lg transition-all duration-500"
                style={{
                  height: `${Math.max(6, pct * 100)}%`,
                  background: "linear-gradient(180deg,#2f855a,#276749)",
                }}
                title={formatINR(value)}
              />
            </div>
            <div className="mt-3 text-sm text-gray-600">Modal Price</div>
            <div className="text-xl font-semibold">{formatINR(value)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Market Rates <span className="text-sm text-gray-500"> (₹/Quintal)</span>
            </h1>
            <p className="text-sm text-gray-500">Live updates · Interactive market explorer</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addRandomMarket}
              className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition"
            >
              + Add Market
            </button>
            <button
              onClick={resetData}
              className="px-4 py-2 bg-white border rounded-md shadow-sm hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 min-w-[72px]">Commodity</label>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 min-w-[40px]">State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="All">All</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <input
                placeholder="Search market..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort</label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="px-3 py-2 border rounded"
              >
                <option value="modalPrice">Modal Price</option>
                <option value="minPrice">Min Price</option>
                <option value="maxPrice">Max Price</option>
              </select>
              <button
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="px-3 py-2 border rounded"
                title="Toggle direction"
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-medium text-gray-700">Price Chart</h2>
                <div className="text-sm text-gray-500">Realtime ticks: {tickRef.current}</div>
              </div>

              <div className="w-full h-64 bg-white rounded border p-4">
                {filtered.length ? (
                  <div className="h-full flex items-end gap-4 overflow-x-auto">
                    {filtered.slice(0, 8).map((m) => {
                      const maxInSet = Math.max(...filtered.map((x) => x.modalPrice), 1);
                      const pct = Math.max(6, (m.modalPrice / maxInSet) * 100);
                      const isSelected = selectedMarketId === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMarketId(m.id)}
                          className={`cursor-pointer w-24 flex flex-col items-center transition transform ${
                            isSelected ? "scale-105" : "hover:scale-102"
                          }`}
                          title={`${m.market} • ${formatINR(m.modalPrice)}`}
                        >
                          <div className="w-full bg-gray-100 rounded-t" style={{ height: `${100 - pct}%` }} />
                          <div
                            className="w-full rounded-b transition-colors"
                            style={{
                              height: `${pct}%`,
                              background: selectedMarketId === m.id ? "linear-gradient(180deg,#2f855a,#276749)" : "#2f855a",
                            }}
                          />
                          <div className="text-xs mt-2 text-center">{m.market}</div>
                          <div className="text-sm font-semibold">{formatINR(m.modalPrice)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No markets match filters.</div>
                )}
              </div>

              <div className="mt-3">
                <input type="range" min={0} max={100} defaultValue={20} className="w-full" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium text-gray-700">Market Details</h2>
                <div className="text-sm text-gray-500">{filtered.length} items</div>
              </div>

              <div className="overflow-x-auto rounded">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="px-3 py-2 w-40">State</th>
                      <th className="px-3 py-2 w-48">Market</th>
                      <th className="px-3 py-2">Commodity</th>
                      <th className="px-3 py-2">Arrival</th>
                      <th className="px-3 py-2 text-right">Min</th>
                      <th className="px-3 py-2 text-right">Max</th>
                      <th className="px-3 py-2 text-right">Modal</th>
                      <th className="px-3 py-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedMarketId(r.id)}
                        className={`cursor-pointer hover:bg-gray-50 transition ${selectedMarketId === r.id ? "bg-green-50" : ""}`}
                      >
                        <td className="px-3 py-3 text-sm">{r.state}</td>
                        <td className="px-3 py-3 text-sm font-medium">{r.market}</td>
                        <td className="px-3 py-3 text-sm">{r.commodity}</td>
                        <td className="px-3 py-3 text-sm text-gray-500">{r.arrivalDate}</td>
                        <td className="px-3 py-3 text-sm text-right">{formatINR(r.minPrice)}</td>
                        <td className="px-3 py-3 text-sm text-right">{formatINR(r.maxPrice)}</td>
                        <td className="px-3 py-3 text-sm text-right font-semibold">{formatINR(r.modalPrice)}</td>
                        <td className="px-3 py-3">
                          <Sparkline values={r.history} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-700">{selected ? selected.market : "—"}</h3>
                  <p className="text-sm text-gray-500">{selected ? `${selected.state} · ${selected.commodity}` : ""}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Last update</div>
                  {/* render clientTime (set in useEffect) to avoid hydration mismatch */}
                  <div className="text-sm font-medium">{clientTime || "—"}</div>
                </div>
              </div>

              <div className="mt-4">
                {selected ? <PriceBar value={selected.modalPrice} max={Math.max(20000, selected.maxPrice * 1.2)} /> : <div className="text-gray-500">Select a market on left</div>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs">Min Price</div>
                  <div className="font-semibold">{selected ? formatINR(selected.minPrice) : "—"}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs">Max Price</div>
                  <div className="font-semibold">{selected ? formatINR(selected.maxPrice) : "—"}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded col-span-2">
                  <div className="text-xs">Modal Price</div>
                  <div className="font-semibold text-lg">{selected ? formatINR(selected.modalPrice) : "—"}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 px-3 py-2 bg-white border rounded hover:bg-gray-50"
                  onClick={() => {
                    if (!selected) return;
                    navigator.clipboard?.writeText(`${selected.market} - ${formatINR(selected.modalPrice)}`);
                    alert("Copied to clipboard");
                  }}
                >
                  Copy Price
                </button>
                <button
                  className="px-3 py-2 bg-green-600 text-white rounded"
                  onClick={() => {
                    if (!selected) return;
                    alert(`Watching ${selected.market} (${formatINR(selected.modalPrice)})`);
                  }}
                >
                  Watch
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium text-gray-700 mb-2">Quick Filters</h4>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setCommodity("Amaranthus"); setStateFilter("Kerala"); }} className="px-3 py-1 border rounded text-sm">Amaranthus · Kerala</button>
                <button onClick={() => { setCommodity("Wheat"); setStateFilter("Punjab"); }} className="px-3 py-1 border rounded text-sm">Wheat · Punjab</button>
                <button onClick={() => { setCommodity("Rice"); setStateFilter("Maharashtra"); }} className="px-3 py-1 border rounded text-sm">Rice · Maharashtra</button>
                <button onClick={() => { setCommodity("Maize"); setStateFilter("All"); }} className="px-3 py-1 border rounded text-sm">Maize · All</button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm text-sm text-gray-600">
              <div className="mb-2 font-medium text-gray-700">Notes</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Values are simulated locally (random walk) every 3s — simulation runs only in the browser to avoid hydration errors.</li>
                <li>Replace the simulation with a WebSocket or polling for real realtime data.</li>
                <li>Click any row or bar to inspect details on the right.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
