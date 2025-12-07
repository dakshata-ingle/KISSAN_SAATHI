'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
// import fields from '@/mock/fields.json'; // <-- use this if tsconfig path alias is configured
import fields from '../../mock/fields.json'; // <-- otherwise use this relative path (adjust if needed)

type Field = {
  id: string;
  name: string;
  country: string;
  state: string;
  district: string;
  village: string;
  lat: number;
  lng: number;
  status: string;
  area_m2: number;
};

export default function Topbar() {
  const router = useRouter();

  // Filters state
  const [country, setCountry] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [village, setVillage] = useState<string>('');

  // language persistence
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('ks_lang') || 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('ks_lang', lang);
  }, [lang]);

  // search
  const [q, setQ] = useState('');

  // derived lists from your mock fields.json
  const countries = useMemo(() => Array.from(new Set(fields.map((f: Field) => f.country))), []);
  const states = useMemo(() => {
    if (!country) return Array.from(new Set(fields.map((f: Field) => f.state)));
    return Array.from(new Set(fields.filter((f: Field) => f.country === country).map(f => f.state)));
  }, [country]);

  const districts = useMemo(() => {
    if (!stateName) return Array.from(new Set(fields.map((f: Field) => f.district)));
    return Array.from(new Set(fields.filter((f: Field) => f.country === country && f.state === stateName).map(f => f.district)));
  }, [country, stateName]);

  const villages = useMemo(() => {
    if (!district) return Array.from(new Set(fields.map((f: Field) => f.village)));
    return Array.from(new Set(fields.filter((f: Field) => f.country === country && f.state === stateName && f.district === district).map(f => f.village)));
  }, [country, stateName, district]);

  // filteredFields computed for search + selected filters
  const filteredFields = useMemo(() => {
    return (fields as Field[]).filter(f => {
      if (country && f.country !== country) return false;
      if (stateName && f.state !== stateName) return false;
      if (district && f.district !== district) return false;
      if (village && f.village !== village) return false;
      if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [country, stateName, district, village, q]);

  function handleRefresh(hard = false) {
    try {
      router.refresh(); // Next app router soft refresh
      if (hard) window.location.reload();
    } catch (err) {
      if (hard) window.location.reload();
    }
  }

  // when parent changes, clear children
  function onCountryChange(c: string) {
    setCountry(c);
    setStateName('');
    setDistrict('');
    setVillage('');
  }

  function onStateChange(s: string) {
    setStateName(s);
    setDistrict('');
    setVillage('');
  }

  function onDistrictChange(d: string) {
    setDistrict(d);
    setVillage('');
  }

  return (
    <header className="bg-[#e9f7ee] border-b">
      <div className="max-w-full mx-auto p-3 flex items-center gap-4">
        {/* search + filters */}
        <div className="flex items-center gap-3 flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // keep inline search; in real app route to results or update global state
            }}
            className="flex items-center gap-3 flex-1"
          >
            <div className="flex items-center bg-white border rounded-lg px-2 py-1 shadow-sm w-[560px]">
              <input
                aria-label="Global search"
                placeholder="Search fields, samples, alerts..."
                className="flex-1 text-sm p-1 outline-none"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" aria-label="Search" className="p-2">
                <Search className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* dynamic dropdowns */}
            <select aria-label="Country" className="rounded-lg border px-3 py-2 bg-white" value={country} onChange={(e) => onCountryChange(e.target.value)}>
              <option value="">Country</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select aria-label="State" className="rounded-lg border px-3 py-2 bg-white" value={stateName} onChange={(e) => onStateChange(e.target.value)}>
              <option value="">State</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select aria-label="District" className="rounded-lg border px-3 py-2 bg-white" value={district} onChange={(e) => onDistrictChange(e.target.value)}>
              <option value="">District</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select aria-label="Village" className="rounded-lg border px-3 py-2 bg-white" value={village} onChange={(e) => setVillage(e.target.value)}>
              <option value="">Village</option>
              {villages.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </form>
        </div>

        {/* right cluster: refresh, language, bell, filtered count */}
        <div className="flex items-center gap-3">
          <div className="text-sm mr-2">Results: <span className="font-semibold">{filteredFields.length}</span></div>

          <button
            title="Refresh"
            aria-label="Refresh"
            onClick={() => handleRefresh(false)}
            className="flex items-center gap-2 bg-[#16A34A] text-white px-3 py-2 rounded-lg hover:bg-[#0f8a3d] focus:outline-none"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <select
            aria-label="Select language"
            className="rounded-lg border px-3 py-2"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
          </select>

          <button aria-label="Notifications" className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
            <Bell className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
