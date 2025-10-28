
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
import MenuAutoUpdateTrigger from './components/MenuAutoUpdateTrigger';
import { SecurityBadge } from "./components/PermissionGuard";
import QualityAutomation from "./components/QualityAutomation";
import { UnifiedUserSync } from "./components/UnifiedUserSync";
import SmartRoleSync from "./components/SmartRoleSync";
import ActivityTracker from "./components/ActivityTracker";

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
        title: "📊 My Attendance",
        url: createPageUrl("MyAttendance"),
        icon: ClipboardCheck,
        badge: null,
      },
      {
        title: "My Checklists",
        url: createPageUrl("MyChecklists"),
        icon: ClipboardList,
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
        title: "📝 Document Library",
        url: createPageUrl("DocumentLibrary"),
        icon: FileText,
        badge: null,
      },
      {
        title: "✍️ Document Builder",
        url: createPageUrl("DocumentBuilder"),
        icon: FilePlus,
        badge: null,
      },
      {
        title: "Daily Checklists",
        url: createPageUrl("DailyChecklists"),
        icon: ClipboardList,
        badge: null,
      },
      {
        title: "Form Intelligence",
        url: createPageUrl("FormIntelligence"),
        icon: Settings,
        badge: "AI",
      },
      {
        title: "⭐ Quality Control",
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
        icon: ShoppingCart,
        badge: null,
      },
      {
        title: "Menu Management",
        url: createPageUrl("MenuManagement"),
        icon: Edit,
        badge: null,
      },
      {
        title: "Menu Intelligence",
        url: createPageUrl("MenuIntelligence"),
        icon: Sparkles,
        badge: "AI",
      },
      {
        title: "Inventory Hub",
        url: createPageUrl("Inventory"),
        icon: Package,
        badge: null,
      },
      {
        title: "Ingredient Stock",
        url: createPageUrl("IngredientStock"),
        icon: Package,
        badge: null,
      },
      {
        title: "Production Planning",
        url: createPageUrl("ProductionPlanning"),
        icon: Calculator,
        badge: null,
      },
      {
        title: "Suppliers",
        url: createPageUrl("SupplierManagement"),
        icon: Users,
        badge: null,
      },
      {
        title: "Purchase Orders",
        url: createPageUrl("Ordering"),
        icon: ShoppingCart,
        badge: null,
      },
    ]
  },
  {
    section: "Team & People",
    items: [
      {
        title: "Team Directory",
        url: createPageUrl("TeamDirectory"),
        icon: Users,
        badge: null,
      },
      {
        title: "Staff Model",
        url: createPageUrl("StaffModel"),
        icon: GraduationCap,
        badge: null,
      },
      {
        title: "Onboarding & Training",
        url: createPageUrl("OnboardingTraining"),
        icon: BookOpen,
        badge: null,
      },
      {
        title: "Performance & Growth",
        url: createPageUrl("PerformanceGrowth"),
        icon: TrendingUp,
        badge: null,
      },
      {
        title: "My Coaching",
        url: createPageUrl("MyCoaching"),
        icon: Target,
        badge: null,
      },
      {
        title: "Shift & Rota",
        url: createPageUrl("StaffRota"),
        icon: Calendar,
        badge: null,
      },
      {
        title: "Manage Availability",
        url: createPageUrl("ManageAvailability"),
        icon: Calendar,
        badge: null,
      },
    ]
  },
  {
    section: "Communication",
    items: [
      {
        title: "Team Chat",
        url: createPageUrl("TeamChat"),
        icon: MessageCircle,
        badge: null,
      },
      {
        title: "📢 Announcements",
        url: createPageUrl("Announcements"),
        icon: MessageCircle,
        badge: null,
      },
      {
        title: "Suggestion Box",
        url: createPageUrl("SuggestionBox"),
        icon: Lightbulb,
        badge: null,
      },
      {
        title: "Culture Building",
        url: createPageUrl("CultureBuilding"),
        icon: Heart,
        badge: null,
      },
    ]
  },
  {
    section: "Feedback & Updates",
    items: [
      {
        title: "🐛 Report a Bug",
        url: createPageUrl("BugReport"),
        icon: AlertTriangle,
        badge: null,
      },
      {
        title: "💡 Feature Ideas",
        url: createPageUrl("FeatureIdeas"),
        icon: Lightbulb,
        badge: null,
      },
      {
        title: "Feature List",
        url: createPageUrl("FeatureList"),
        icon: Zap,
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
    title: "💰 Payroll Dashboard",
    url: createPageUrl("PayrollDashboard"),
    icon: DollarSign,
    badge: "NEW",
  },
  {
    title: "💵 Weekly Payroll",
    url: createPageUrl("WeeklyPayrollReport"),
    icon: DollarSign,
    badge: null,
  },
  {
    title: "💳 Staff Wages",
    url: createPageUrl("StaffWagesReport"),
    icon: CreditCard,
    badge: null,
  },
  {
    title: "✅ Attendance Approval",
    url: createPageUrl("AttendanceApproval"),
    icon: ClipboardCheck,
    badge: null,
  },
  {
    title: "📊 Attendance Reports",
    url: createPageUrl("AttendanceReports"),
    icon: BarChart3,
    badge: null,
  },
  {
    title: "📊 Cost Analytics",
    url: createPageUrl("CostAnalyticsDashboard"),
    icon: TrendingUp,
    badge: "AI",
  },
  {
    title: "🤖 AI Stock Verification",
    url: createPageUrl("AIStockVerification"),
    icon: Camera,
    badge: "AI",
  },
  {
    title: "📦 Supplier Catalog",
    url: createPageUrl("SupplierCatalogImport"),
    icon: Upload,
    badge: "NEW",
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
    title: "🎓 SOP Certifications",
    url: createPageUrl("SOPCertifications"),
    icon: Award,
    badge: null,
  },
  {
    title: "Smart Scheduler",
    url: createPageUrl("SmartScheduler"),
    icon: Calendar,
    badge: "AI",
  },
  {
    title: "🤖 AI Rota Generator",
    url: createPageUrl("AIRotaGenerator"),
    icon: Zap,
    badge: "AI",
  },
  {
    title: "📋 Shift Templates",
    url: createPageUrl("ShiftTemplates"),
    icon: ClipboardList,
    badge: null,
  },
  {
    title: "Weekly Rota",
    url: createPageUrl("WeeklyRota"),
    icon: Calendar,
    badge: null,
  },
  {
    title: "EHO Control Center",
    url: createPageUrl("EHOControlCenter"),
    icon: Shield,
    badge: "AUDIT",
  },
  {
    title: "🏢 Leafe Dashboard",
    url: createPageUrl("LeafeDashboard"),
    icon: Activity,
    badge: null,
  },
  {
    title: "Performance Dashboard",
    url: createPageUrl("PerformanceDashboard"),
    icon: TrendingUp,
    badge: null,
  },
  {
    title: "Coaching Dashboard",
    url: createPageUrl("CoachingDashboard"),
    icon: Target,
    badge: null,
  },
  {
    title: "Quick Quality Check",
    url: createPageUrl("QuickQualityCheck"),
    icon: Zap,
    badge: null,
  },
  {
    title: "Quality Templates",
    url: createPageUrl("QualityTemplates"),
    icon: ClipboardList,
    badge: null,
  },
  {
    title: "Quality Reports",
    url: createPageUrl("QualityReports"),
    icon: BarChart3,
    badge: null,
  },
  {
    title: "Checklist Builder",
    url: createPageUrl("ChecklistBuilder"),
    icon: Edit,
    badge: null,
  },
  {
    title: "Checklist Monitor",
    url: createPageUrl("ChecklistMonitor"),
    icon: Activity,
    badge: null,
  },
  {
    title: "Form Builder",
    url: createPageUrl("FormBuilder"),
    icon: Edit,
    badge: null,
  },
  {
    title: "Form Library",
    url: createPageUrl("FormLibrary"),
    icon: FileText,
    badge: null,
  },
  {
    title: "Form Scheduler",
    url: createPageUrl("FormScheduler"),
    icon: Calendar,
    badge: null,
  },
  {
    title: "Task Reports",
    url: createPageUrl("TaskReports"),
    icon: BarChart3,
    badge: null,
  },
  {
    title: "Reports & Analytics",
    url: createPageUrl("Reports"),
    icon: BarChart3,
    badge: null,
  },
  {
    title: "Menu Analysis",
    url: createPageUrl("MenuAnalysis"),
    icon: BarChart3,
    badge: null,
  },
  {
    title: "Order History",
    url: createPageUrl("OrderHistory"),
    icon: FileText,
    badge: null,
  },
  {
    title: "Document Management",
    url: createPageUrl("DocumentManagement"),
    icon: FileText,
    badge: null,
  },
  {
    title: "📝 Document Signatures",
    url: createPageUrl("DocumentSignatureReport"),
    icon: Edit,
    badge: null,
  },
  {
    title: "Data Management",
    url: createPageUrl("DataManagement"),
    icon: Database,
    badge: null,
  },
  {
    title: "Backup Settings",
    url: createPageUrl("BackupSettings"),
    icon: Database,
    badge: null,
  },
  {
    title: "Privacy Center",
    url: createPageUrl("PrivacyCenter"),
    icon: Shield,
    badge: null,
  },
  {
    title: "👥 User Management",
    url: createPageUrl("UserManagement"),
    icon: Users,
    badge: "ADMIN",
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
    title: "📧 Email Integration",
    url: createPageUrl("EmailIntegrationHub"),
    icon: MessageCircle,
    badge: null,
  },
  {
    title: "🌉 DataBridge Monitor",
    url: createPageUrl("DataBridgeMonitor"),
    icon: Activity,
    badge: "LIVE",
  },
  {
    title: "🛡️ System Protection",
    url: createPageUrl("SystemProtection"),
    icon: Shield,
    badge: null,
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
      <WelcomeNewUser />
      
      <StaffDataSync />
      <UnifiedUserSync />
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
      {/* ✨ NEW: Activity Tracker - Auto-logs all activities */}
      <ActivityTracker />

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
        } lg:translate-x-0 w-64 overflow-y-auto`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-200 flex-shrink-0">
            <div className="flex flex-col items-center justify-center">
              <AuraLogo size="default" />
              <p className="text-xs text-center text-slate-600 font-medium mt-3">
                Restaurant Operations Assistant
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
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
                                  ? 'bg-orange-100 text-orange-700'
                                  : item.badge === 'NEW'
                                    ? 'bg-red-100 text-red-700'
                                    : item.badge === 'ADMIN'
                                      ? 'bg-teal-100 text-teal-700'
                                      : item.badge === 'RBAC'
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : item.badge === 'GDPR'
                                          ? 'bg-purple-100 text-purple-700'
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
          <div className="p-4 border-t border-slate-200 flex-shrink-0">
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
