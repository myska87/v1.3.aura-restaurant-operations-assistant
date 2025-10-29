import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Users,
  BarChart3,
  LogOut,
  Menu as MenuIcon,
  X,
  Utensils,
  BookOpen,
  Star,
  FileText,
  Calendar,
  MessageCircle,
  Search,
  Settings,
  ChevronDown,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import AgentInitializer from './components/aurabrain/AgentInitializer';

// Role-based navigation configuration
const getRoleNavigation = (user) => {
  if (!user) return [];

  const position = user.position?.toLowerCase();
  const isManager = user.role === 'admin' || position === 'manager' || position === 'owner';

  // Manager Navigation
  if (isManager) {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "Operations", url: createPageUrl("OperationsDashboard"), icon: ClipboardCheck },
      { title: "Staff", url: createPageUrl("StaffDashboard"), icon: Users },
      { title: "Inventory", url: createPageUrl("InventoryDashboard"), icon: Package },
      { title: "Reports", url: createPageUrl("Reports"), icon: BarChart3 },
      { title: "Settings", url: createPageUrl("SettingsDashboard"), icon: Settings },
    ];
  }

  // Chef / Kitchen Navigation
  if (position === 'chef' || position === 'sous_chef' || position === 'line_cook') {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "Menu", url: createPageUrl("Menu"), icon: Utensils },
      { title: "SOPs", url: createPageUrl("SOPDashboardHub"), icon: BookOpen },
      { title: "Inventory", url: createPageUrl("InventoryDashboard"), icon: Package },
      { title: "Quality", url: createPageUrl("QualityDashboard"), icon: Star },
      { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
    ];
  }

  // Front of House Navigation
  if (position === 'server' || position === 'bartender' || position === 'host') {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
      { title: "My Tasks", url: createPageUrl("MyTasks"), icon: ClipboardCheck },
      { title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageCircle },
      { title: "Documents", url: createPageUrl("DocumentsDashboard"), icon: FileText },
      { title: "Training", url: createPageUrl("OnboardingTraining"), icon: BookOpen },
    ];
  }

  // Cleaning / Maintenance Navigation
  if (position === 'cleaner' || position === 'maintenance') {
    return [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
      { title: "My Tasks", url: createPageUrl("MyTasks"), icon: ClipboardCheck },
      { title: "Quality Checks", url: createPageUrl("QuickQualityCheck"), icon: Star },
      { title: "Maintenance", url: createPageUrl("Maintenance"), icon: Settings },
      { title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageCircle },
    ];
  }

  // Default Navigation (fallback)
  return [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
    { title: "My Tasks", url: createPageUrl("MyTasks"), icon: ClipboardCheck },
    { title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageCircle },
  ];
};

// All pages for search (comprehensive list)
const ALL_PAGES = [
  { name: "Dashboard", url: createPageUrl("Dashboard"), keywords: "home main overview" },
  { name: "Operations", url: createPageUrl("OperationsDashboard"), keywords: "tasks checklists daily" },
  { name: "Staff", url: createPageUrl("StaffDashboard"), keywords: "team employees scheduling" },
  { name: "Inventory", url: createPageUrl("InventoryDashboard"), keywords: "stock supplies ordering" },
  { name: "Quality", url: createPageUrl("QualityDashboard"), keywords: "audits checks standards" },
  { name: "SOPs", url: createPageUrl("SOPDashboardHub"), keywords: "procedures training guides" },
  { name: "Documents", url: createPageUrl("DocumentsDashboard"), keywords: "files policies contracts" },
  { name: "Reports", url: createPageUrl("Reports"), keywords: "analytics statistics data" },
  { name: "Menu Management", url: createPageUrl("Menu"), keywords: "food dishes recipes pricing" },
  { name: "My Shifts", url: createPageUrl("MyShifts"), keywords: "schedule rota roster" },
  { name: "My Tasks", url: createPageUrl("MyTasks"), keywords: "todo assignments work" },
  { name: "Clock In/Out", url: createPageUrl("ClockInOut"), keywords: "attendance time tracking" },
  { name: "Team Chat", url: createPageUrl("TeamChat"), keywords: "messages communication" },
  { name: "Announcements", url: createPageUrl("Announcements"), keywords: "news updates notices" },
  { name: "Team Directory", url: createPageUrl("TeamDirectory"), keywords: "contacts staff list" },
  { name: "Training", url: createPageUrl("OnboardingTraining"), keywords: "learning courses onboarding" },
  { name: "Performance", url: createPageUrl("PerformanceGrowth"), keywords: "reviews feedback growth" },
  { name: "Payroll", url: createPageUrl("PayrollDashboard"), keywords: "wages salary pay" },
  { name: "Compliance", url: createPageUrl("ComplianceCore"), keywords: "regulations safety health" },
  { name: "Hygiene", url: createPageUrl("HygieneDashboard"), keywords: "cleanliness temperature" },
  { name: "Maintenance", url: createPageUrl("Maintenance"), keywords: "repairs equipment issues" },
  { name: "Settings", url: createPageUrl("SettingsDashboard"), keywords: "configuration admin" },
  { name: "Analytics", url: createPageUrl("AnalyticsDashboard"), keywords: "insights metrics kpi" },
  { name: "AI Hub", url: createPageUrl("AIHub"), keywords: "artificial intelligence brain" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const navigation = getRoleNavigation(user);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  // Filter pages by search query
  const filteredPages = searchQuery
    ? ALL_PAGES.filter(page =>
        page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.keywords.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <AgentInitializer>
      <div className="min-h-screen flex w-full bg-gray-50">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 w-72 overflow-y-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {/* Header */}
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <div>
                  <h2 className="font-bold text-xl text-gray-900">AURA</h2>
                  <p className="text-xs text-gray-500">Restaurant Assistant</p>
                </div>
              </div>
              <button
                className="lg:hidden p-1 hover:bg-gray-100 rounded"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Global Search */}
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Search pages...</span>
              <kbd className="ml-auto px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Role Badge */}
          {user && (
            <div className="px-4 py-3">
              <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Your Role</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {user.position?.replace('_', ' ') || 'Staff Member'}
                </p>
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="p-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-3 border-t border-gray-100 mt-auto">
            <p className="text-xs font-semibold text-gray-500 mb-2 px-3">QUICK ACTIONS</p>
            <div className="space-y-1">
              <Link to={createPageUrl("ClockInOut")} onClick={() => setSidebarOpen(false)}>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  ⏰ Clock In/Out
                </button>
              </Link>
              <Link to={createPageUrl("TeamChat")} onClick={() => setSidebarOpen(false)}>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  💬 Team Chat
                </button>
              </Link>
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                🔍 Find Anything...
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4">
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.position?.replace('_', ' ') || "Staff"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-72">
          {/* Mobile Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200"
              >
                <MenuIcon className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">AURA</h1>
              <button
                onClick={() => setSearchOpen(true)}
                className="ml-auto hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <Search className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">{children}</div>
        </main>

        {/* Global Search Dialog */}
        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput placeholder="Search pages, features, or modules..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Pages">
              {filteredPages.slice(0, 10).map((page) => (
                <CommandItem
                  key={page.url}
                  onSelect={() => {
                    window.location.href = page.url;
                    setSearchOpen(false);
                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span>{page.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </AgentInitializer>
  );
}