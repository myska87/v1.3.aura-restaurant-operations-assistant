
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Wrench,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
  Calculator,
  ClipboardList,
  GraduationCap,
  MessageCircle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Clock,
  Shield,
  FileText,
  Database,
  Activity,
  Settings,
  Sparkles,
  Mic,
  Edit,
  Star,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  CreditCard,
  Camera,
  Upload,
  Briefcase,
  Target,
  Award,
  BookOpen,
  Heart,
  Zap,
  TrendingDown,
  ShoppingCart,
  FilePlus,
  Bell,
  Brain,
} from "lucide-react";
import WelcomeNewHire from "./components/WelcomeNewHire";
import WelcomeNewUser from "./components/WelcomeNewUser";
import ChecklistAutomation from "./components/ChecklistAutomation";
import NotificationBell from "./components/NotificationBell";
import AuraLogo from "./components/AuraLogo";
import AutoBackupScheduler from "./components/AutoBackupScheduler";
import { StaffDataSync } from "./components/StaffDataSync";
import MenuImporter from "./components/MenuImporter";
import SystemStatusCheck from "./components/SystemStatusCheck";
import ComplianceEventListener from "./components/ComplianceEventListener";
import ChangeDetector from "./components/ChangeDetector";
import DataBridgeEngine from "./components/DataBridgeEngine";
import FormIntelligenceEngine from "./components/FormIntelligenceEngine";
import FormScheduler from "./components/FormScheduler";
import { ComplianceStyles } from "./components/ComplianceStyles";
import MenuAutoUpdateTrigger from "./components/MenuAutoUpdateTrigger";
import { SecurityBadge } from "./components/PermissionGuard";
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

// 🧠 AURA Brain Imports
import HygieneAgent from './components/aurabrain/HygieneAgent';
import InventoryAgent from './components/aurabrain/InventoryAgent';
import QualityAgent from './components/aurabrain/QualityAgent';
import EventBus from './components/aurabrain/EventBus';
import AgentInitializer from './components/aurabrain/AgentInitializer';

const navigationItems = [
  {
    section: "Main",
    items: [
      {
        title: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
        badge: null,
      },
      {
        title: "🎯 Operations",
        url: createPageUrl("OperationsDashboard"),
        icon: Target,
        badge: null,
      },
      {
        title: "👥 Staff",
        url: createPageUrl("StaffDashboard"),
        icon: Users,
        badge: null,
      },
      {
        title: "📦 Inventory",
        url: createPageUrl("InventoryDashboard"),
        icon: Package,
        badge: null,
      },
      {
        title: "📚 SOPs",
        url: createPageUrl("SOPDashboardHub"),
        icon: FileText,
        badge: null,
      },
      {
        title: "⭐ Quality",
        url: createPageUrl("QualityDashboard"),
        icon: Star,
        badge: null,
      },
      {
        title: "📄 Documents",
        url: createPageUrl("DocumentsDashboard"),
        icon: FilePlus,
        badge: null,
      },
    ]
  },
  {
    section: "My Work",
    items: [
      {
        title: "My Tasks",
        url: createPageUrl("MyTasks"),
        icon: CheckCircle,
        badge: null,
      },
      {
        title: "My Shifts",
        url: createPageUrl("MyShifts"),
        icon: Calendar,
        badge: null,
      },
      {
        title: "Clock In/Out",
        url: createPageUrl("ClockInOut"),
        icon: Clock,
        badge: null,
      },
      {
        title: "My Coaching",
        url: createPageUrl("MyCoaching"),
        icon: GraduationCap,
        badge: null,
      },
    ]
  },
  {
    section: "Intelligence",
    items: [
      {
        title: "🧠 AURA Brain",
        url: createPageUrl("AIHub"),
        icon: Brain,
        badge: "AI",
      },
      {
        title: "Reports",
        url: createPageUrl("Reports"),
        icon: BarChart3,
        badge: null,
      },
    ]
  },
];

const managementItems = [
  {
    title: "💼 Manager Dashboard",
    url: createPageUrl("ManagerDashboard"),
    icon: Briefcase,
  },
  {
    title: "📅 Smart Scheduler",
    url: createPageUrl("SmartScheduler"),
    icon: Calendar,
  },
  {
    title: "🛡️ Compliance Centre",
    url: createPageUrl("ComplianceCore"),
    icon: Shield,
  },
  {
    title: "⚙️ Settings",
    url: createPageUrl("SettingsDashboard"),
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

  const isManager = user?.position === "manager" || user?.position === "owner" || user?.role === "admin";

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
        
        <StaffDataSync />
        <UnifiedUserSync />
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

        {/* 🧠 AURA Brain - Intelligent Agents */}
        <AgentInitializer />
        <EventBus />
        <HygieneAgent />
        <InventoryAgent />
        <QualityAgent />

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
            {navigationItems.map((section, index) => (
              <div key={index}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                  {section.section}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={itemIndex}
                        to={item.url}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 font-medium"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <span className="text-sm">{item.title}</span>
                        </div>
                        {item.badge && (
                          <Badge className="bg-emerald-600 text-white text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {isManager && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                  Management
                </h3>
                <div className="space-y-1">
                  {managementItems.map((item, index) => {
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
                        <Icon className="w-5 h-5" />
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
