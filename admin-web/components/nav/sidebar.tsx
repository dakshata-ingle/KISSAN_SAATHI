"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Map,
  Leaf,
  FlaskConical,
  BarChart,
  Settings,
  Bell,
  GitPullRequest,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Map Viewer", href: "/map", icon: Map },
  { name: "Fields", href: "/fields", icon: Leaf },
  { name: "Soil Health", href: "/soil", icon: FlaskConical },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen p-4 fixed left-0 top-0">
      <div className="text-2xl font-bold px-2 mb-6">
        Kissan Saathi
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium",
                active
                  ? "bg-neutral-100 text-black"
                  : "text-neutral-600 hover:bg-neutral-50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
