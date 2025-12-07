"use client";

import { Input } from "@/components/ui/input";
import { Bell, Menu } from "lucide-react";
import { useUiStore } from "@/lib/store";

export function Topbar() {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    <div className="w-full flex items-center justify-between px-6 py-3 border-b bg-white sticky top-0 z-20">
      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Search */}
      <Input
        placeholder="Search..."
        className="max-w-sm"
      />

      {/* Icons */}
      <div className="flex items-center gap-6">
        <Bell className="w-6 h-6 text-gray-600" />

        {/* User Avatar */}
        <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );
}
