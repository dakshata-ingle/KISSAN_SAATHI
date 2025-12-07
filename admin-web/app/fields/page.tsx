// app/fields/page.tsx
"use client";

import React, { useMemo, useState } from "react";

/**
 * Fields page (upper UI only)
 * - No sidebar/topbar imports (assumes layout already renders them)
 * - Tailwind CSS utilities used (ensure Tailwind is configured)
 * - Interactive: search, view toggle, sort chips, import/add farm buttons
 */

type ViewMode = "grid" | "list";

export default function FieldsTopUI() {
  // user-controlled state
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [activeSort, setActiveSort] = useState<string | null>(null);
  const [kpiFarms] = useState<number>(20);
  const [kpiArea] = useState<string>("4 ac / 17,800 m²");
  const [kpiCrops] = useState<number>(20);

  const onToggleSort = (key: string) => {
    setActiveSort(prev => (prev === key ? null : key));
  };

  // small responsive helpers
  const placeholderCards = useMemo(() => {
    // Just used for showing when you later want to plug list; currently we hide cards
    return [];
  }, []);

  return (
    <div className="min-h-[40vh] bg-[#f6fbf9] text-gray-800">
      <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">My Farms</h1>
            <p className="mt-1 text-sm text-gray-500">Overview of your registered fields and quick actions</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("Import clicked")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm hover:shadow transition"
            >
              <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="15" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Import
            </button>

            <button
              onClick={() => alert("Add Farm clicked")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow hover:from-green-600 hover:to-green-700 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              + Add Farm
            </button>
          </div>
        </div>

        {/* KPI chips */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-green-50 border-green-200 shadow-sm min-w-[200px]">
            <div className="p-3 rounded-md bg-white/80 border border-gray-100">
              <svg className="w-6 h-6 text-green-700" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Farms</div>
              <div className="text-lg font-semibold text-gray-900">{kpiFarms}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl border bg-blue-50 border-blue-200 shadow-sm min-w-[260px]">
            <div className="p-3 rounded-md bg-white/80 border border-gray-100">
              <svg className="w-6 h-6 text-blue-700" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Area</div>
              <div className="text-lg font-semibold text-gray-900">{kpiArea}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl border bg-pink-50 border-pink-200 shadow-sm min-w-[200px]">
            <div className="p-3 rounded-md bg-white/80 border border-gray-100">
              <svg className="w-6 h-6 text-pink-700" viewBox="0 0 24 24" fill="none">
                <path d="M12 3c-3 0-5 3-7 6s-3 6-3 9h20c0-3-1-6-3-9s-4-6-7-6z" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Crops</div>
              <div className="text-lg font-semibold text-gray-900">{kpiCrops}</div>
            </div>
          </div>
        </div>

        {/* Search & controls row */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* left: search input + view toggle */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg flex-1 min-w-0">
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search farms..."
                className="bg-transparent outline-none text-sm w-full min-w-0"
                aria-label="Search farms"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-md ${view === "grid" ? "bg-gray-100 shadow-sm" : "hover:bg-gray-50"}`}
                title="Grid view"
              >
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 10h8V13h-8v10z" fill="currentColor"/></svg>
              </button>

              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-md ${view === "list" ? "bg-gray-100 shadow-sm" : "hover:bg-gray-50"}`}
                title="List view"
              >
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* right: sort chips */}
          <div className="flex items-center gap-3">
            <SortChip label="Sowing" active={activeSort === "sowing"} onClick={() => onToggleSort("sowing")} />
            <SortChip label="Harvest" active={activeSort === "harvest"} onClick={() => onToggleSort("harvest")} />
            <SortChip label="Area" active={activeSort === "area"} onClick={() => onToggleSort("area")} />

            <button
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm bg-white hover:shadow-sm"
              onClick={() => alert("Advanced Filters")}
            >
              Advanced Filters
            </button>
          </div>
        </div>

        {/* subtle separator */}
        <div className="mt-6 border-t border-dashed border-gray-100" />

        {/* NOTE: intentionally no farm cards rendered below */}
        <div className="mt-6 text-sm text-gray-500 italic">Farm cards / map area intentionally omitted here.</div>
      </div>
    </div>
  );
}

/* -------------------------
   Small subcomponents inline
   ------------------------- */

function SortChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${active ? "bg-white text-gray-900 shadow" : "bg-transparent text-gray-600"}`}
      aria-pressed={active}
    >
      <span>{label}</span>
      <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    </button>
  );
}
