// components/layout/ProfileMenu.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, User } from 'lucide-react';

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const onLogout = async () => {
    // placeholder: call your logout API if available
    // await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-50 hover:bg-slate-100"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <span className="text-sm">You</span>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg border z-50">
          <div className="py-1">
            <Link href="/profile" className="block px-3 py-2 text-sm hover:bg-slate-50">View Profile</Link>
            <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-slate-50">Settings</Link>
            <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}
