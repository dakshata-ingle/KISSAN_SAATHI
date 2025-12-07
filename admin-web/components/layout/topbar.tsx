'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
// import fields from '@/mock/fields.json';
import fields from '../../mock/fields.json';

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

// Extend window type for Google Translate globals
declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

export default function Topbar() {
  const router = useRouter();

  // Filters state
  const [country, setCountry] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [village, setVillage] = useState<string>('');

  // language persistence and state
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('ks_lang') || 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('ks_lang', lang);
  }, [lang]);

  // Load Google Translate widget once on client
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Callback that the Google script will call
    window.googleTranslateElementInit = function googleTranslateElementInit() {
      try {
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element'
        );
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      } catch (err) {
        // ignore initialization error
        // console.warn('google translate init failed', err);
      }
    };

    // Don't re-add script if already present
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const s = document.createElement('script');
      s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      document.body.appendChild(s);
    }

    // If user has previously selected a language, set cookie so translation persists
    // Note: changing cookie + reload is the easiest reliable way to let the Google widget apply translation.
    // See `applyGoogleTranslate` below.
  }, []);

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
      router.refresh();
      if (hard) window.location.reload();
    } catch (err) {
      if (hard) window.location.reload();
    }
  }

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

  /**
   * Apply language using Google Translate widget.
   *
   * NOTE / Practical limitation:
   * - The official Google Translate webpage element typically applies translations by setting
   *   a cookie named 'googtrans' and reloading the page (or relying on the widget to translate).
   * - There is no official modern JS API to "change language in-place" for all setups, so this function
   *   sets the cookie `googtrans=/en/<lang>` and then reloads the page so the widget picks it up.
   * - This works in the classic translated widget use-cases but may have limitations for advanced SPAs.
   */
  function applyGoogleTranslate(targetLang: string) {
    if (typeof document === 'undefined') return;

    // store selection
    localStorage.setItem('ks_lang', targetLang);
    setLang(targetLang);

    try {
      // set googtrans cookie used by the translate widget: from '/en' to '/<targetLang>'
      // Example cookie value: /en/hi
      // Path must be '/' so Google widget can read it on any route
      document.cookie = `googtrans=/en/${targetLang}; path=/; max-age=31536000;`;

      // Some setups also use the "googtrans" key on window.localStorage or other cookies.
      // We'll also set it on localStorage for some wrappers (harmless).
      try {
        localStorage.setItem('googtrans', `/en/${targetLang}`);
      } catch (_) { /* no-op */ }

      // If Google translate iframe/menu is already present we could try to interact with it,
      // but cross-origin constraints often prevent it. So most reliable approach is to reload:
      window.location.reload();
    } catch (err) {
      // fallback: if anything goes wrong, just reload (user still sees change in saved lang)
      window.location.reload();
    }
  }

  return (
    // NOTE: header has NO position fixed/sticky classes — it will scroll normally with page
    <header className="bg-[#e9f7ee] border-b">
      <div className="max-w-full mx-auto p-3 flex items-center gap-4">
        {/* search + filters */}
        <div className="flex items-center gap-3 flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
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

          {/* Language selector: uses Google Translate integration */}
          <select
            aria-label="Select language"
            className="rounded-lg border px-3 py-2"
            value={lang}
            onChange={(e) => {
              // use the translate widget approach
              applyGoogleTranslate(e.target.value);
            }}
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

      {/* Hidden container for Google Translate widget — required for the script to initialize */}
      <div id="google_translate_element" style={{ display: 'none' }} />
    </header>
  );
}
