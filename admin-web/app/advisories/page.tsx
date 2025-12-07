// app/advisories/page.tsx
"use client";

import React, { useMemo, useState } from "react";

/**
 * Single-file Advisories UI for Next.js app router
 * - Tailwind CSS required
 * - Drop into app/advisories/page.tsx
 */

type AdvisorySeverity = "info" | "warning" | "alert" | "critical";
type AdvisoryType = "current" | "forecast";

type Advisory = {
  id: string;
  title: string;
  summary: string;
  crop: string;
  farmName: string;
  date: string; // ISO date
  severity: AdvisorySeverity;
  type: AdvisoryType;
  actions: string[];
  tags?: string[];
};

const SAMPLE_ADVISORIES: Advisory[] = [
  {
    id: "a1",
    title: "Sheath blight — early signs",
    summary:
      "Fungal infection starts from base of plants in waterlogged fields. Keep an eye on lesion development on leaves.",
    crop: "Rice",
    farmName: "My Farm 10",
    date: "2025-11-09",
    severity: "warning",
    type: "current",
    actions: [
      "Drain excess water where possible",
      "Avoid repeated deep irrigation",
      "Apply approved fungicide (Carbendazim/Propiconazole) if lesions spread"
    ],
    tags: ["fungal", "waterlogging"]
  },
  {
    id: "a2",
    title: "Roots taking hold — advisory",
    summary:
      "Maintain good field hygiene and follow recommended irrigation schedule to support root establishment.",
    crop: "Rice",
    farmName: "My Farm 10",
    date: "2025-11-09",
    severity: "info",
    type: "current",
    actions: ["Maintain even shallow irrigation", "Remove competing weeds"],
    tags: ["root health"]
  },
  {
    id: "a3",
    title: "Cleaning & storing produce — forecast",
    summary:
      "Forecast indicates rainfall in 3–5 days. Plan harvest and post-harvest storage accordingly — avoid field drying on rainy days.",
    crop: "Rice",
    farmName: "My Farm 12",
    date: "2025-11-10",
    severity: "info",
    type: "forecast",
    actions: [
      "Schedule harvesting before heavy rains",
      "Prepare dry storage and cover sacks",
      "Ensure ventilation in storage"
    ],
    tags: ["post-harvest", "forecast"]
  },
  {
    id: "a4",
    title: "Locust movement risk — alert",
    summary:
      "Neighbouring districts reported small swarms. Monitor fields at dawn and dusk. Early detection reduces damage.",
    crop: "Multi",
    farmName: "Community Farms",
    date: "2025-11-11",
    severity: "alert",
    type: "current",
    actions: [
      "Install light traps and manual removal",
      "Coordinate with local agri-extension for control measures"
    ],
    tags: ["pest", "locust"]
  },
  {
    id: "a5",
    title: "Heat stress risk for young plants",
    summary:
      "High daytime temperature for next 2 days may stress seedlings; provide shade and frequent light irrigation.",
    crop: "Vegetables",
    farmName: "Demo Plot",
    date: "2025-11-12",
    severity: "warning",
    type: "forecast",
    actions: ["Mulch to conserve moisture", "Provide temporary shade"],
    tags: ["heat", "irrigation"]
  },
  {
    id: "a6",
    title: "Critical flood advisory — immediate action",
    summary:
      "Heavy rainfall likely; low-lying fields will flood. Evacuate livestock and move valuable inputs to higher ground.",
    crop: "Multi",
    farmName: "Village Cluster",
    date: "2025-11-12",
    severity: "critical",
    type: "current",
    actions: [
      "Move livestock and equipment",
      "Disconnect electricity near water",
      "Coordinate with local authorities"
    ],
    tags: ["flood", "evacuation"]
  }
];

function severityColor(s: AdvisorySeverity) {
  switch (s) {
    case "info":
      return "bg-blue-100 text-blue-700";
    case "warning":
      return "bg-yellow-100 text-yellow-800";
    case "alert":
      return "bg-indigo-100 text-indigo-800";
    case "critical":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | AdvisoryType | "critical">(
    "all"
  );
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc");
  const [data, setData] = useState<Advisory[]>(SAMPLE_ADVISORIES);
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const counts = useMemo(() => {
    const all = data.length;
    const current = data.filter((d) => d.type === "current").length;
    const forecast = data.filter((d) => d.type === "forecast").length;
    const critical = data.filter((d) => d.severity === "critical").length;
    return { all, current, forecast, critical };
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = data.filter((a) => {
      if (filterType === "critical") {
        if (a.severity !== "critical") return false;
      } else if (filterType !== "all") {
        if (a.type !== filterType) return false;
      }
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.crop.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
    if (sortBy === "date-desc") {
      items = items.sort((x, y) => (x.date < y.date ? 1 : -1));
    } else {
      items = items.sort((x, y) => (x.date > y.date ? 1 : -1));
    }
    return items;
  }, [data, query, filterType, sortBy]);

  function toggleBookmark(id: string) {
    setBookmarks((b) => ({ ...b, [id]: !b[id] }));
  }

  function refreshData() {
    // Simulate a refresh: shuffle dates or append a new mock advisory
    const newAdvisory: Advisory = {
      id: "a" + Math.floor(Math.random() * 10000),
      title: "Soil moisture check recommended",
      summary:
        "Soil moisture trending low — check rootzone and irrigate early morning to avoid salt buildup.",
      crop: "Cotton",
      farmName: "My Farm X",
      date: new Date().toISOString().slice(0, 10),
      severity: "info",
      type: Math.random() > 0.5 ? "current" : "forecast",
      actions: ["Check soil moisture at 15cm depth", "Apply light irrigation"],
      tags: ["soil", "irrigation"]
    };
    setData((d) => [newAdvisory, ...d].slice(0, 20));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(90deg,#ecf9f2, #f6fff9)] p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Advisories</h1>
            <p className="text-sm text-slate-600">
              Stay informed about weather, pests and production steps that affect your farm.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white shadow px-3 py-2 rounded-full">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-sm text-slate-700">{counts.all} Total</span>
            </div>

            <button
              onClick={refreshData}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M20 8a8 8 0 10-2.5 5.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {/* stats */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="rounded-lg p-3 bg-gradient-to-br from-purple-400 to-pink-300">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-500">Total</div>
              <div className="text-xl font-semibold text-slate-800">{counts.all}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="rounded-lg p-3 bg-blue-100">
              <svg className="w-6 h-6 text-blue-700" viewBox="0 0 24 24" fill="none">
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-500">Current</div>
              <div className="text-xl font-semibold text-slate-800">{counts.current}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="rounded-lg p-3 bg-green-100">
              <svg className="w-6 h-6 text-green-700" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-500">Forecast</div>
              <div className="text-xl font-semibold text-slate-800">{counts.forecast}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="rounded-lg p-3 bg-red-100">
              <svg className="w-6 h-6 text-red-700" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-500">Critical</div>
              <div className="text-xl font-semibold text-slate-800">{counts.critical}</div>
            </div>
          </div>
        </section>

        {/* search and filters */}
        <section className="bg-white rounded-xl p-4 shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search advisories, crops, tags..."
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-2 text-slate-500"
                    aria-label="clear"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-50 p-1">
                {["all", "current", "forecast", "critical"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filterType === f
                        ? "bg-green-600 text-white shadow"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg">
                <button
                  title="Grid"
                  onClick={() => setView("grid")}
                  className={`p-2 rounded ${view === "grid" ? "bg-white shadow" : "text-slate-600"}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="8" height="8" stroke="currentColor" strokeWidth="1.5"></rect>
                    <rect x="13" y="3" width="8" height="8" stroke="currentColor" strokeWidth="1.5"></rect>
                    <rect x="3" y="13" width="8" height="8" stroke="currentColor" strokeWidth="1.5"></rect>
                    <rect x="13" y="13" width="8" height="8" stroke="currentColor" strokeWidth="1.5"></rect>
                  </svg>
                </button>
                <button
                  title="List"
                  onClick={() => setView("list")}
                  className={`p-2 rounded ${view === "list" ? "bg-white shadow" : "text-slate-600"}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 12h16" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 18h16" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
              </select>
            </div>
          </div>
        </section>

        {/* advisory list */}
        <section>
          {filtered.length === 0 ? (
            <div className="text-center text-slate-600 py-8">No advisories found.</div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((a) => (
                <article key={a.id} className="bg-white rounded-2xl shadow p-5 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{a.title}</h3>
                      <div className="text-xs text-slate-500 mt-1">
                        <span className="inline-block mr-2">{a.farmName}</span>
                        <span className="inline-block px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                          {a.crop}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${severityColor(a.severity)}`}>
                        {a.severity.toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-400">{a.date}</div>
                    </div>
                  </div>

                  <p className="text-slate-600 mt-4 line-clamp-4">{a.summary}</p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {a.tags?.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-slate-50 border border-slate-100 px-2 py-1 rounded-full text-slate-600"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleBookmark(a.id)}
                        className={`p-2 rounded-full ${bookmarks[a.id] ? "bg-yellow-100" : "hover:bg-slate-100"}`}
                        aria-label="bookmark"
                      >
                        {bookmarks[a.id] ? "★" : "☆"}
                      </button>
                      <button
                        onClick={() => alert(`Recommended actions:\n\n- ${a.actions.join("\n- ")}`)}
                        className="px-3 py-1 rounded-md bg-green-50 text-green-700 text-sm"
                      >
                        View actions
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((a) => (
                <div key={a.id} className="bg-white rounded-lg shadow p-4 flex items-start gap-4">
                  <div className="w-3/4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{a.title}</h3>
                        <div className="text-xs text-slate-500 mt-1">
                          {a.farmName} • {a.crop} • <span className="text-slate-400">{a.date}</span>
                        </div>
                      </div>

                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${severityColor(a.severity)}`}>
                        {a.severity.toUpperCase()}
                      </div>
                    </div>

                    <p className="text-slate-600 mt-2">{a.summary}</p>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {a.tags?.map((t) => (
                        <span key={t} className="text-xs bg-slate-50 px-2 py-1 rounded-full text-slate-600">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="w-1/4 flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleBookmark(a.id)}
                      className={`p-2 rounded-full ${bookmarks[a.id] ? "bg-yellow-100" : "hover:bg-slate-100"}`}
                    >
                      {bookmarks[a.id] ? "★" : "☆"}
                    </button>
                    <button
                      onClick={() => alert(`Recommended actions:\n\n- ${a.actions.join("\n- ")}`)}
                      className="px-3 py-1 rounded-md bg-green-50 text-green-700 text-sm"
                    >
                      Actions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* helpful tips / CTA */}
        <section className="mt-8 bg-white shadow rounded-xl p-6 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-slate-800">Recommended advisories for farmers</h4>
            <ul className="mt-3 list-disc list-inside text-slate-600 space-y-2">
              <li>Check soil moisture before irrigating to avoid waterlogging and disease.</li>
              <li>Monitor pests at dawn/dusk and use traps or integrated pest management first.</li>
              <li>Schedule harvest around weather forecasts; protect produce from rain.</li>
              <li>Store seeds and chemicals in a dry, elevated, ventilated space.</li>
              <li>Keep an advisory log for each field — date, action, outcome (helps next season).</li>
            </ul>
          </div>

          <div className="w-full md:w-72">
            <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
              <div className="text-sm text-slate-500">Quick actions</div>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => {
                    const important = data.find((d) => d.severity === "critical");
                    if (important) alert(`Critical advisory:\n\n${important.title}\n\n${important.summary}`);
                    else alert("No critical advisories at the moment.");
                  }}
                  className="w-full py-2 rounded-md bg-red-600 text-white"
                >
                  Show critical
                </button>
                <button
                  onClick={() => {
                    const pests = data.filter((d) => d.tags?.includes("pest") || d.tags?.includes("locust"));
                    if (pests.length) alert(`Pest advisories:\n\n${pests.map((p) => p.title).join("\n")}`);
                    else alert("No pest advisories found.");
                  }}
                  className="w-full py-2 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200"
                >
                  Show pest advisories
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert("Link copied to clipboard");
                  }}
                  className="w-full py-2 rounded-md bg-white border"
                >
                  Share page
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 text-sm text-slate-500">
          Tip: Tap "View actions" to see step-by-step recommendations for each advisory.
        </footer>
      </div>
    </main>
  );
}
