/**"use client";

import React from "react";

function LeftNav() {
  return (
    <nav className="w-64 bg-gray-50 border-r p-4 hidden md:block">
      <div className="font-bold mb-4">Kissan Saathi</div>
      <ul>
        <li className="py-2">Dashboard</li>
        <li className="py-2">Map</li>
        <li className="py-2">Fields</li>
        <li className="py-2">Soil</li>
        <li className="py-2">Irrigation</li>
      </ul>
    </nav>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <LeftNav />

      <div className="flex-1">
        <header className="flex items-center justify-between p-4 border-b">
          <div>Search...</div>
          <div className="flex items-center gap-4">
            <button aria-label="notifications">🔔</button>
            <div className="w-8 h-8 bg-gray-300 rounded-full" />
          </div>
        </header>

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
*/


// app/layout.tsx
/**import './globals.css'; */

import Topbar from '@/components/layout/topbar';
import BottomNav from '@/components/layout/BottomNav';
export const metadata = { title: 'Kisaan Saathi Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Topbar - no main nav here */}
          <div className="sticky top-0 z-30">
            <Topbar />
          </div>

          {/* Main: full width; pb must be >= BottomNav height so content remains visible */}
          <main className="flex-1 overflow-auto bg-[#F3F7F6] p-6 pb-[140px]">
            {children}
          </main>
        </div>

        {/* BottomNav appended directly under body makes it behave reliably */}
        <BottomNav />
      </body>
    </html>
  );
}
