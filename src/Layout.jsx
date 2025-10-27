
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
  Activity, // Added Activity icon
  Settings, // Added Settings icon for Form Intelligence
  Sparkles, // Added Sparkles icon for Menu Intelligence
  Mic, // Added Mic icon for Meeting Intelligence
  Edit, // Added Edit icon for SOP Builder
  Star, // Added Star icon for Quality
} from "lucide-react";
import WelcomeNewHire from "./components/WelcomeNewHire";
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
import MenuAutoUpdateTrigger from './components/MenuAutoUpdateTrigger';
import { SecurityBadge } from "./components/PermissionGuard";
import QualityAutomation from "./components/QualityAutomation"; // Added Quality Automation
import { UnifiedUserSync } from "./components/UnifiedUserSync"; // Added UnifiedUserSync
import { SmartRoleSync } from "./components/SmartRoleSync"; // Added SmartRoleSync

const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center justify-center rounded-full text-center font-semibold leading-none whitespace-nowrap ${className}`}>
    {children}
  </span>
);

const navigationItems = [
  {
    section: "Daily Essentials",
    items: [
      {
        title: "Dashboard",
        url: createPageUrl("Dashboard"),
        icon: LayoutDashboard,
        badge: null,
      },
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
        title: "Hygiene Central",
        url: createPageUrl("HygieneDashboard"),
        icon: Activity,
        badge: null,
      },
    ]
  },
  {
    section: "Operations",
    items: [
      {
        title: "📚 SOPs & Procedures",
        url: createPageUrl("SOPDashboard"),
        icon: FileText,
        badge: null,
      },
      {
        title: "Form Intelligence",
        url: createPageUrl("FormIntelligence"),
        icon: Settings,
        badge: "AI",
      },
      {
        title: "⭐ Quality Control", // Added Quality Control
        url: createPageUrl("QualityDashboard"),
        icon: Star,
        badge: null,
      },
      {
        title: "Compliance",
        url: createPageUrl("Compliance"),
        icon: Shield,
        badge: null,
      },
      {
        title: "Maintenance",
        url: createPageUrl("Maintenance"),
        icon: Wrench,
        badge: null,
      },
    ]
  },
  {
    section: "Inventory & Menu",
    items: [
      {
        title: "🍽️ Menu",
        url: createPageUrl("Menu"),
        icon: Package, // Reusing Package icon for Menu as it fits well for products/items
        badge: null,
      },
      {
        title: "Inventory Hub",
        url: createPageUrl("Inventory"),
        icon: Package,
        badge: null,
      },
      {
        title: "Production Planning",
        url: createPageUrl("ProductionPlanning"),
        icon: Calculator,
        badge: null,
      },
    ]
  },
  {
    section: "Team & People",
    items: [
      {
        title: "Staff Model",
        url: createPageUrl("StaffModel"),
        icon: GraduationCap,
        badge: null,
      },
      {
        title: "Shift & Rota",
        url: createPageUrl("StaffRota"),
        icon: Users,
        badge: null,
      },
      {
        title: "Team Chat",
        url: createPageUrl("TeamChat"),
        icon: MessageCircle,
        badge: null,
      },
    ]
  },
];

const managementItems = [
  {
    title: "Manager Dashboard",
    url: createPageUrl("ManagerDashboard"),
    icon: TrendingUp,
    badge: "MGMT",
  },
  {
    title: "🤖 Hey AURA - AI Console",
    url: createPageUrl("AIConsole"),
    icon: Sparkles,
    badge: "AI",
  },
  {
    title: "🎙️ Meeting Intelligence",
    url: createPageUrl("MeetingDashboard"),
    icon: Mic,
    badge: "AI",
  },
  {
    title: "📝 SOP Builder",
    url: createPageUrl("SOPBuilder"),
    icon: Edit,
    badge: null,
  },
  {
    title: "Smart Scheduler",
    url: createPageUrl("SmartScheduler"),
    icon: Calendar,
    badge: "AI",
  },
  {
    title: "EHO Control Center",
    url: createPageUrl("EHOControlCenter"),
    icon: Shield,
    badge: "AUDIT",
  },
  {
    title: "Menu Intelligence",
    url: createPageUrl("MenuIntelligence"),
    icon: Sparkles,
    badge: "AI",
  },
  {
    title: "Reports & Analytics",
    url: createPageUrl("Reports"),
    icon: BarChart3,
    badge: null,
  },
  {
    title: "Document Management",
    url: createPageUrl("DocumentManagement"),
    icon: FileText,
    badge: null,
  },
  {
    title: "Data Management",
    url: createPageUrl("DataManagement"),
    icon: Database,
    badge: null,
  },
  {
    title: "🔒 Security & Permissions",
    url: createPageUrl("SecurityDashboard"),
    icon: Shield,
    badge: "RBAC",
  },
  {
    title: "🔒 Compliance & Privacy",
    url: createPageUrl("ComplianceDashboard"),
    icon: Shield,
    badge: "GDPR",
  },
  {
    title: "🌉 DataBridge Monitor",
    url: createPageUrl("DataBridgeMonitor"),
    icon: Activity,
    badge: "LIVE",
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isActive = (url) => {
    return location.pathname === url;
  };

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ComplianceStyles />
      <AutoBackupScheduler />
      <WelcomeNewHire />
      
      <StaffDataSync />
      <UnifiedUserSync /> {/* Added UnifiedUserSync */}
      <MenuImporter />
      <SystemStatusCheck />
      <ComplianceEventListener />

      {/* 🔒 PROTECTION SYSTEM COMPONENTS */}
      <ChangeDetector />
      {/* AURA_DataBridge - Secure Module Integration System */}
      <DataBridgeEngine />
      {/* AURA_FormIntelligence - Smart Form Assignment Engine */}
      <FormIntelligenceEngine />
      <FormScheduler />

      {/* 🍽️ Menu Auto-Update Service */}
      <MenuAutoUpdateTrigger />
      {/* ⭐ Quality Automation Service */}
      <QualityAutomation />
      {/* 🔄 Smart Role Sync - Automatic Workflow Updates on Position Change */}
      <SmartRoleSync />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-700" />
              ) : (
                <Menu className="w-6 h-6 text-slate-700" />
              )}
            </button>
            <AuraLogo size="small" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="text-sm font-medium text-slate-700">
              {user?.full_name}
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col items-center justify-center">
              <AuraLogo size="default" />
              <p className="text-xs text-center text-slate-600 font-medium mt-3">
                Restaurant Operations Assistant
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {navigationItems.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <div className="px-3 mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {section.section}
                  </p>
                </div>
                
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.url);

                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          active
                            ? "bg-gradient-to-r from-blue-50 to-green-50 text-blue-700 font-medium shadow-sm"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-slate-500"}`} />
                        <span className="text-sm flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700">
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
                <div className="px-3 mb-2 mt-6 pt-6 border-t border-slate-200">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Management Tools
                  </p>
                </div>
                
                <div className="space-y-1">
                  {managementItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.url);

                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          active
                            ? "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 font-medium shadow-sm"
                            : "text-slate-700 hover:bg-purple-50"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${active ? "text-purple-600" : "text-slate-500"}`} />
                        <span className="text-sm flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge className={`text-xs px-1.5 py-0.5 ${
                            item.badge === 'AI' 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                              : item.badge === 'LIVE'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                : item.badge === 'AUDIT'
                                  ? 'bg-orange-100 text-orange-700' // Added style for AUDIT badge
                                  : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.full_name || "User"}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                {/* Add Security Badge */}
                <div className="mt-1">
                  <SecurityBadge user={user} className="text-[10px] px-2 py-0.5" />
                </div>
              </div>
              <div className="hidden lg:block">
                <NotificationBell />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
