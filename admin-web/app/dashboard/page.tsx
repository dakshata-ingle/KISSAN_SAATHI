/**import MainLayout from "@/components/layout/main-layout";

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="text-3xl font-bold">Dashboard</div>
    </MainLayout>
  );
}*/


// app/dashboard/page.tsx
import React from "react";
import DashboardClient from "./DashboardClient"; // client component (has "use client")

export default function DashboardPage() {
  return (
    <main className="p-6 min-h-screen bg-slate-50">
      <DashboardClient />
    </main>
  );
}

