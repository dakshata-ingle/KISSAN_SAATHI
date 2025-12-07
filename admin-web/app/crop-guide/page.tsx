// app/crop-guide/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Crop = {
  id: number;
  name: string;
  category: string;
  description: string;
  image: string; // local path (e.g. /images/tomato.jpg)
  guideAvailable: boolean;
};

const CATEGORIES = [
  "Vegetable",
  "Fruit",
  "Cereal",
  "Pulse",
  "Oilseed",
  "Spice",
  "Cash Crop",
  "Beverage",
  "Fiber",
  "Plantation",
];

const SAMPLE_CROPS: Crop[] = [
  { id: 1, name: "Tomato", category: "Vegetable", description: "Tomato is widely grown and rich in vitamins A, C, and lycopene. Best for salads and cooking.", image: "/images/tomato.jpg", guideAvailable: true },
  { id: 2, name: "Potato", category: "Vegetable", description: "Potato is a versatile tuber crop, rich in carbohydrates and used worldwide.", image: "/images/potato.jpg", guideAvailable: true },
  { id: 3, name: "Onion", category: "Vegetable", description: "Onion is an essential vegetable and spice crop, rich in antioxidants and sulfur compounds.", image: "/images/onion.jpg", guideAvailable: true },
  { id: 4, name: "Bhendi (Okra)", category: "Vegetable", description: "Okra is a warm-season vegetable high in vitamins, minerals and fiber; common in many cuisines.", image: "/images/okra.jpg", guideAvailable: false },
  { id: 5, name: "Wheat", category: "Cereal", description: "Wheat is a major cereal crop used for flour production and staples around the world.", image: "/images/wheat.jpg", guideAvailable: true },
  { id: 6, name: "Rice", category: "Cereal", description: "Rice is a primary staple for many populations; many varieties and cultivation methods exist.", image: "/images/rice.jpg", guideAvailable: true },
  { id: 7, name: "Chili", category: "Spice", description: "Chili peppers are heat providers used as spice & medicine. Requires warm growing conditions.", image: "/images/chili.jpg", guideAvailable: false },
  { id: 8, name: "Sugarcane", category: "Cash Crop", description: "Sugarcane – tall perennial grass used for sugar and bio-products; needs water and warm climate.", image: "/images/sugarcane.jpg", guideAvailable: true },
  { id: 9, name: "Tomato (Extra)", category: "Fruit", description: "Tomato (as a fruit) used in many cuisines — sweet to tangy varieties available.", image: "/images/tomato-extra.jpg", guideAvailable: true },
  { id: 10, name: "Soybean", category: "Pulse", description: "Soybean is a high-protein legume used for oil and animal feed; fits well in crop rotations.", image: "/images/soybean.jpg", guideAvailable: false },
  { id: 11, name: "Cotton", category: "Fiber", description: "Cotton is an important fiber crop grown in warm climates; requires pest and water management.", image: "/images/cotton.jpg", guideAvailable: true },
  { id: 12, name: "Tea", category: "Beverage", description: "Tea plantations thrive in hilly, acidic soils and cool climates; high-value cash crop.", image: "/images/tea.jpg", guideAvailable: false },
];

export default function Page() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>(["Vegetable"]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"A-Z" | "Z-A">("A-Z");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setCrops(SAMPLE_CROPS);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const categoriesUsed = useMemo(() => {
    const used = new Set(crops.map((c) => c.category));
    return CATEGORIES.filter((c) => used.has(c));
  }, [crops]);

  const filtered = useMemo(() => {
    let list = crops.slice();
    if (activeCategories.length > 0) {
      list = list.filter((c) => activeCategories.includes(c.category));
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s));
    }
    list.sort((a, b) => (sort === "A-Z" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return list;
  }, [crops, activeCategories, search, sort]);

  const totalGuides = useMemo(() => crops.filter((c) => c.guideAvailable).length, [crops]);

  function toggleCategory(cat: string) {
    setActiveCategories((prev) => (prev.includes(cat) ? prev.filter((p) => p !== cat) : [...prev, cat]));
  }

  function clearFilters() {
    setActiveCategories([]);
    setSearch("");
    setSort("A-Z");
  }

  return (
    <main className="p-6 lg:p-10 bg-gray-50 min-h-screen">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-slate-800 flex items-center gap-3">🌾 Crop Guide</h1>
            <p className="text-sm text-slate-500 mt-1">A knowledge base for farmers — search crops, filter by category, and open guides.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border rounded-md px-3 py-2 shadow-sm">
              <button onClick={() => { setActiveCategories(["Vegetable"]); setView("grid"); }} className="text-sm text-slate-600 hover:text-slate-800">Quick Reset</button>
            </div>

            <div className="bg-white border rounded-md p-2 flex items-center gap-1 shadow-sm">
              <button className={`px-3 py-1 rounded-md text-sm ${view === "grid" ? "bg-green-50 text-green-700" : "text-slate-600"}`} onClick={() => setView("grid")} aria-label="Grid view">☐ Grid</button>
              <button className={`px-3 py-1 rounded-md text-sm ${view === "list" ? "bg-green-50 text-green-700" : "text-slate-600"}`} onClick={() => setView("list")} aria-label="List view">☰ List</button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
            <div className="rounded-full bg-green-50 p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a1 1 0 001 1h3m10 0h3a1 1 0 001-1V7M5 7V5a2 2 0 012-2h2m8 4V5a2 2 0 00-2-2h-2" /></svg>
            </div>
            <div><div className="text-sm text-slate-500">Total Crops</div><div className="text-xl font-semibold text-slate-800">{crops.length || SAMPLE_CROPS.length}</div></div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
            <div className="rounded-full bg-blue-50 p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zM6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
            </div>
            <div><div className="text-sm text-slate-500">Guides</div><div className="text-xl font-semibold text-slate-800">{totalGuides}</div></div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
            <div className="rounded-full bg-pink-50 p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 11h14M7 15h10" /></svg>
            </div>
            <div><div className="text-sm text-slate-500">Categories</div><div className="text-xl font-semibold text-slate-800">{categoriesUsed.length}</div></div>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-sm text-slate-600 font-medium">Filter by Category:</div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setActiveCategories([])} className={`px-3 py-1 rounded-full text-sm border ${activeCategories.length === 0 ? "bg-green-600 text-white" : "bg-white text-slate-600"}`}>All</button>
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => toggleCategory(cat)} className={`px-3 py-1 rounded-full text-sm border flex items-center gap-2 ${activeCategories.includes(cat) ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-slate-600"}`}>
                    <span className="text-xs">🌱</span><span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search crops..." className="w-64 lg:w-80 px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-green-200" />
                {search && <button onClick={() => setSearch("")} className="absolute right-2 top-2 text-slate-500 text-sm">✕</button>}
              </div>

              <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="px-3 py-2 rounded-md border bg-white" aria-label="Sort crops">
                <option>A-Z</option>
                <option>Z-A</option>
              </select>

              <button onClick={clearFilters} className="px-3 py-2 rounded-md border bg-white text-slate-600">Clear</button>
            </div>
          </div>
        </div>

        {/* Showing count */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">Showing <span className="font-medium text-slate-800">{filtered.length}</span> of <span className="font-medium text-slate-800">{crops.length || SAMPLE_CROPS.length}</span> crops</div>
          <div className="text-sm text-slate-600">Sort: <span className="font-medium">{sort}</span></div>
        </div>

        {/* Grid / List */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white p-4 rounded-lg border shadow-sm">
                  <div className="h-[140px] bg-gray-100 rounded-md mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border text-center text-slate-600">No crops found — try different filters or clear search.</div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((crop) => (
                <article key={crop.id} className="bg-white rounded-xl overflow-hidden border hover:shadow-lg transition-shadow duration-150">
                  {/* Passport-size image block (fixed exact size 90x120) */}
                  <div className="p-4 flex justify-center">
                    <div className="w-[90px] h-[120px] rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={crop.image}
                        alt={crop.name}
                        width={90}
                        height={120}
                        loading="lazy"
                        className="w-[90px] h-[120px] object-cover block"
                        style={{ display: "block" }}
                      />
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-800 text-lg">{crop.name}</h3>
                      <div className="text-xs text-slate-500">{crop.category}</div>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-3 mb-3">{crop.description}</p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button className="text-sm px-3 py-1 rounded-md border bg-white text-slate-600 hover:bg-green-50">View Guide</button>
                        <button className="text-sm px-3 py-1 rounded-md border bg-white text-slate-600 hover:bg-slate-50">Save</button>
                      </div>

                      <div className="text-xs text-slate-500">ID #{crop.id}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((crop) => (
                <div key={crop.id} className="bg-white p-4 rounded-lg border flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-[90px] h-[120px] rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={crop.image}
                        alt={crop.name}
                        width={90}
                        height={120}
                        loading="lazy"
                        className="w-[90px] h-[120px] object-cover block"
                        style={{ display: "block" }}
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-semibold text-slate-800">{crop.name}</h3>
                      <div className="text-xs text-slate-500">{crop.category}</div>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-3">{crop.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {crop.guideAvailable ? <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Guide Available</span> : <span className="text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded-full">No Guide</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-sm text-slate-500">Tip: Click <span className="font-medium">View Guide</span> to open a crop's specific guide (example UI placeholder).</div>
      </div>
    </main>
  );
}
