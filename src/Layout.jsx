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
  MessageCircle,
  Bell,
  Target,
  Brain,
  Shield,
  BarChart3,
  Settings,
} from "lucide-react";
import WelcomeNewHire from "./components/WelcomeNewHire";
import WelcomeNewUser from "./components/WelcomeNewUser";
import NotificationBell from "./components/NotificationBell";
import AuraLogo from "./components/AuraLogo";
import AutoBackupScheduler from "./components/AutoBackupScheduler";
import MenuImporter from "./components/MenuImporter";
import SystemStatusCheck from "./components/SystemStatusCheck";
import ComplianceEventListener from "./components/ComplianceEventListener";
import ChangeDetector from "./components/ChangeDetector";
import DataBridgeEngine from "./components/DataBridgeEngine";
import FormIntelligenceEngine from "./components/FormIntelligenceEngine";
import FormScheduler from "./components/FormScheduler";
import { ComplianceStyles } from "./components/ComplianceStyles";
import MenuAutoUpdateTrigger from "./components/MenuAutoUpdateTrigger";
import QualityAutomation from "./components/QualityAutomation";
import { UnifiedUserSync } from "./components/UnifiedUserSync";
import SmartRoleSync from "./components/SmartRoleSync";
import ActivityTracker from "./components/ActivityTracker";
import TaskAutomationEngine from "./components/operationscore/TaskAutomationEngine";
import AISummaryEngine from "./components/operationscore/AISummaryEngine";
import OperationsLinkManager from "./components/operationscore/OperationsLinkManager";
import EventProcessor from "./components/eventhub/EventProcessor";
import EventRouter from "./components/eventhub/EventRouter";
import AutoActionEngine from "./components/eventhub/AutoActionEngine";
import DataAggregator from "./components/analyticscore/DataAggregator";
import AIInsightsEngine from "./components/analyticscore/AIInsightsEngine";
import PredictiveInsightsEngine from "./components/PredictiveInsightsEngine";
import RenewalMonitor from "./components/compliancecore/RenewalMonitor";
import AIComplianceSummary from "./components/compliancecore/AIComplianceSummary";
import ErrorBoundary from "./components/ErrorBoundary";
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
    badge: "Hub",
  },
  {
    title: "Inventory",
    url: createPageUrl("InventoryDashboard"),
    icon: Package,
    color: "from-blue-500 to-indigo-600",
    badge: "Hub",
  },
  {
    title: "Staff",
    url: createPageUrl("StaffDashboard"),
    icon: Users,
    color: "from-purple-500 to-pink-600",
    badge: "Hub",
  },
  {
    title: "SOPs & Training",
    url: createPageUrl("SOPsDashboard"),
    icon: BookOpen,
    color: "from-indigo-500 to-purple-600",
    badge: "Hub",
  },
  {
    title: "Quality & Hygiene",
    url: createPageUrl("QualityDashboardHub"),
    icon: Star,
    color: "from-amber-500 to-orange-600",
    badge: "Hub",
  },
  {
    title: "Documents",
    url: createPageUrl("DocumentsDashboard"),
    icon: FileText,
    color: "from-gray-500 to-slate-600",
    badge: "Hub",
  },
];

const quickAccessItems = [
  {
    title: "My Tasks",
    url: createPageUrl("MyTasks"),
    icon: Target,
  },
  {
    title: "My Shifts",
    url: createPageUrl("MyShifts"),
    icon: LayoutDashboard,
  },
  {
    title: "Team Chat",
    url: createPageUrl("TeamChat"),
    icon: MessageCircle,
  },
  {
    title: "Announcements",
    url: createPageUrl("Announcements"),
    icon: Bell,
  },
];

const adminItems = [
  {
    title: "Analytics",
    url: createPageUrl("AnalyticsDashboard"),
    icon: BarChart3,
  },
  {
    title: "AI Intelligence",
    url: createPageUrl("AuraIntelligence"),
    icon: Brain,
  },
  {
    title: "Security",
    url: createPageUrl("SecurityDashboard"),
    icon: Shield,
  },
  {
    title: "Settings",
    url: createPageUrl("DataManagement"),
    icon: Settings,
  },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === "admin" || user?.position === "owner";

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ComplianceStyles />
        <AutoBackupScheduler />
        <WelcomeNewHire />
        <WelcomeNewUser />
        
        <MenuImporter />
        <SystemStatusCheck />
        <ComplianceEventListener />

        <ChangeDetector />
        <DataBridgeEngine />
        <FormIntelligenceEngine />
        <FormScheduler />

        <MenuAutoUpdateTrigger />
        <QualityAutomation />
        <SmartRoleSync />
        <ActivityTracker />

        <TaskAutomationEngine />
        <AISummaryEngine />
        <OperationsLinkManager />

        <EventProcessor />
        <EventRouter />
        <AutoActionEngine />

        <DataAggregator />
        <AIInsightsEngine />

        <PredictiveInsightsEngine />

        <RenewalMonitor />
        <AIComplianceSummary />

        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-700" />
              ) : (
                <Menu className="w-6 h-6 text-slate-700" />
              )}
            </button>
            <AuraLogo />
          </div>
          <NotificationBell />
        </header>

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 w-64 overflow-y-auto`}
        >
          <div className="p-6 border-b border-slate-200 hidden lg:flex items-center justify-between">
            <AuraLogo />
            <NotificationBell />
          </div>

          <nav className="p-4 space-y-6">
            {/* Main Hubs */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                Main Hubs
              </h3>
              <div className="space-y-1">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.url;
                  return (
                    <Link
                      key={index}
                      to={item.url}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all group ${
                        isActive
                          ? "bg-gradient-to-r " + item.color + " text-white font-medium shadow-lg"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{item.title}</span>
                      </div>
                      {item.badge && (
                        <Badge className={`text-xs ${
                          isActive ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick Access */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                Quick Access
              </h3>
              <div className="space-y-1">
                {quickAccessItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.url;
                  return (
                    <Link
                      key={index}
                      to={item.url}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 font-medium"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                  Administration
                </h3>
                <div className="space-y-1">
                  {adminItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={index}
                        to={item.url}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-purple-50 text-purple-700 font-medium"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-slate-200">
            {user && (
              <div className="mb-3 px-3">
                <p className="text-sm font-medium text-slate-900">
                  {user.full_name}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  {user.position && (
                    <Badge className="capitalize text-xs">
                      {user.position.replace("_", " ")}
                    </Badge>
                  )}
                  {user.role === "admin" && (
                    <Badge className="bg-purple-600 text-white text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}