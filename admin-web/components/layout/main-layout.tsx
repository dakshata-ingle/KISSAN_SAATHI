// app/layout.tsx
import './globals.css';
import Topbar from '@/components/layout/topbar';
import BottomNav from '@/components/layout/BottomNav';

export const metadata = { title: 'Kisaan Saathi Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <div className="flex h-full flex-col">

          {/* Topbar NOT fixed now */}
          <Topbar />

          {/* Main scrollable area */}
          <main className="flex-1 overflow-auto bg-[#F3F7F6] p-6 pb-[110px]">
            {children}
          </main>

          {/* BottomNav remains fixed */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
