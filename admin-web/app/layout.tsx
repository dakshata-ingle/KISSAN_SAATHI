import './globals.css';
import MainLayout from "./components/layout/main-layout";

export const metadata = {
  title: "KISSAN SAATHI Admin",
  description: "Admin Web Application",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}

