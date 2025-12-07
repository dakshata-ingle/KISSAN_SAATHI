// app/layout.tsx
import './globals.css';
import Topbar from '@/components/layout/topbar';
import BottomNav from '@/components/layout/BottomNav';

export const metadata = { title: 'Kisaan Saathi Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* full viewport height; hide page-level scroll so main handles scroll */}
      <body className="h-screen overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Topbar always at top */}
          <div className="sticky top-0 z-20">
            <Topbar />
          </div>

          {/* Main scrollable area. Add bottom padding so content won't be hidden behind fixed BottomNav */}
          <main className="flex-1 overflow-auto bg-[#F3F7F6] p-6 pb-[110px]">
            {children}
          </main>

          {/* Bottom cards nav (fixed) */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
