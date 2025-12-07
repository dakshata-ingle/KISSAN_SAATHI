/**import Topbar from '@/components/layout/topbar';
import BottomNav from '@/components/layout/BottomNav';
export const metadata = { title: 'Kisaan Saathi Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <div className="flex h-full flex-col">
          
          <div className="sticky top-0 z-30">
            <Topbar />
          </div>

          <main className="flex-1 overflow-auto bg-[#F3F7F6] p-6 pb-[140px]">
            {children}
          </main>
        </div>

        <BottomNav />
      </body>
    </html>
  );
}
*/

"use client";

import { usePathname } from "next/navigation";
import Topbar from "@/components/layout/topbar";
import BottomNav from "@/components/layout/BottomNav";

export const metadata = { title: "Kisaan Saathi Admin" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  // Show Topbar ONLY on homepage (/)
  const showTopbar = pathname === "/";

  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">

        <div className="flex h-full flex-col">

          {/* TOPBAR only on page.tsx (/) */}
          {showTopbar && (
            <div>
              <Topbar />
            </div>
          )}

          {/* MAIN PAGE CONTENT */}
          <main className="flex-1 overflow-auto bg-[#F3F7F6] p-6 pb-[140px]">
            {children}
          </main>

        </div>

        {/* FIXED BOTTOM NAV */}
        <BottomNav />

      </body>
    </html>
  );
}

