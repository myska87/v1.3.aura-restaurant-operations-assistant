import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  Users,
  BookOpen,
  Star,
  FileText,
  Menu,
  X,
  LogOut,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Operations",
    url: createPageUrl("OperationsDashboard"),
    icon: Target,
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Inventory",
    url: createPageUrl("InventoryDashboard"),
    icon: Package,
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Staff",
    url: createPageUrl("StaffDashboard"),
    icon: Users,
    color: "from-purple-500 to-pink-600",
  },
  {
    title: "SOPs",
    url: createPageUrl("SOPsDashboard"),
    icon: BookOpen,
    color: "from-indigo-500 to-purple-600",
  },
  {
    title: "Quality",
    url: createPageUrl("QualityDashboardHub"),
    icon: Star,
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Documents",
    url: createPageUrl("DocumentsDashboard"),
    icon: FileText,
    color: "from-gray-500 to-slate-600",
  },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Starting AURA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="text-xl font-bold text-emerald-600">AURA</span>
      </header>

      <aside className={`fixed top-0 left-0 h-full bg-white border-r z-50 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 w-64 overflow-y-auto`}>
        <div className="p-6 border-b hidden lg:block">
          <span className="text-2xl font-bold text-emerald-600">AURA ONE PRO</span>
        </div>

        <nav className="p-4">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={index}
                to={item.url}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg mb-1 ${isActive ? "bg-gradient-to-r " + item.color + " text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          {user && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}