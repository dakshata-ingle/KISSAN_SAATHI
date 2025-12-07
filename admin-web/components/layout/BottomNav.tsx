'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  Grid,
  Map,
  Layers,
  Zap,
  Droplet,
  FileText,
  BarChart2,
  BookOpen,
  AlertCircle,
  Star
} from 'lucide-react';

const items = [
  { href: '/map', label: 'Farm Management', icon: MapPin },
  { href: '/dashboard', label: 'Dashboard', icon: Grid },
  { href: '/fields', label: 'My Farms', icon: Map },
  { href: '/compare', label: 'Compare Map', icon: Layers },
  { href: '/weather', label: 'Weather', icon: Zap },
  { href: '/soil', label: 'Soil Analysis', icon: Droplet },
  { href: '/vra', label: 'VRA Maps', icon: FileText },
  { href: '/market', label: 'Market Rates', icon: BarChart2 },
  { href: '/crop-guide', label: 'Crop Guide', icon: BookOpen },
  { href: '/advisories', label: 'Advisories', icon: AlertCircle },
  { href: '/farm-score', label: 'Farm Score', icon: Star }
];

export default function BottomNav() {
  const pathname = usePathname() || '/dashboard';
  const [mounted, setMounted] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const id = 'bottom-nav-portal';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
      console.log('[BottomNav] created portal element', el);
    } else {
      console.log('[BottomNav] found portal element', el);
    }
    setPortalEl(el);
    setMounted(true);

    return () => {
      // keep the portal element during dev/HMR; remove here if you want cleanup
      console.log('[BottomNav] unmount cleanup (no DOM removal by default)');
    };
  }, []);

  // safety: do not render until mounted on client
  if (!mounted || !portalEl) return null;

  // inline styles (no dependency on tailwind for visibility)
  const wrapperStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 16,
    zIndex: 2147483000,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'auto', // allow clicks
  };

  const containerStyle: React.CSSProperties = {
    width: 'min(1200px,96%)',
    borderRadius: 16,
    padding: '10px 14px',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    overflowX: 'auto',
    // green agriculture theme (inline so it shows regardless of CSS load)
    background: 'linear-gradient(180deg,#16A34A,#0f6d37)',
    boxShadow: '0 16px 40px rgba(6,45,21,0.28)',
    border: '1px solid rgba(0,0,0,0.06)',
    color: '#fff',
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 10,
    textDecoration: 'none',
    minWidth: 130,
    background: active ? 'linear-gradient(180deg,#0f6431,#0d5a2c)' : 'transparent',
    color: '#fff',
    boxShadow: active ? '0 8px 18px rgba(0,0,0,0.16)' : 'none'
  });

  // create DOM tree to be portaled
  const nav = (
    <div style={wrapperStyle} aria-hidden={false} data-bottomnav="true">
      <nav
        role="navigation"
        aria-label="Primary"
        style={containerStyle}
      >
        {/* small decorative leaf (left) */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 6, marginRight: 6 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M2 12c6-8 16-10 20-10-2 6-6 16-12 18-4-1-8-6-8-8z" fill="rgba(255,255,255,0.08)"/>
          </svg>
        </div>

        <ul style={{ display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map(it => {
            const active = pathname === it.href || pathname.startsWith(it.href + '/');
            const Icon = it.icon;
            return (
              <li key={it.href} style={{ flex: '0 0 auto' }}>
                <Link href={it.href} aria-current={active ? 'page' : undefined} style={itemStyle(active)}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.06)'
                  }}>
                    <Icon style={{ width: 18, height: 18, color: '#fff' }} />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* breathe space on right */}
        <div style={{ width: 8 }} />
      </nav>
    </div>
  );

  return createPortal(nav, portalEl);
}
