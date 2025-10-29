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
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  Calendar,
  FileText,
  Utensils,
  GraduationCap,
  MessageCircle,
  Star,
  Brain,
  Shield,
  DollarSign,
  Database,
  TrendingUp,
  BookOpen,
} from "lucide-react";

const mainNavigation = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Operations",
    url: createPageUrl("OperationsDashboard"),
    icon: ClipboardCheck,
  },
  {
    title: "Inventory",
    url: createPageUrl("InventoryDashboard"),
    icon: Package,
  },
  {
    title: "Smart Scheduler",
    url: createPageUrl("SmartScheduler"),
    icon: Calendar,
  },
  {
    title: "Staff",
    url: createPageUrl("StaffDashboard"),
    icon: Users,
  },
  {
    title: "SOPs",
    url: createPageUrl("SOPDashboardHub"),
    icon: BookOpen,
  },
  {
    title: "Quality",
    url: createPageUrl("QualityDashboard"),
    icon: Star,
  },
  {
    title: "Documents",
    url: createPageUrl("DocumentsDashboard"),
    icon: FileText,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
  },
];

const otherTools = [
  {
    category: "📋 Forms & Checklists",
    items: [
      { title: "Form Builder", url: createPageUrl("FormBuilder") },
      { title: "Form Library", url: createPageUrl("FormLibrary") },
      { title: "Form Intelligence", url: createPageUrl("FormIntelligence") },
      { title: "Checklist Templates", url: createPageUrl("ChecklistTemplates") },
      { title: "My Checklists", url: createPageUrl("MyChecklists") },
      { title: "Daily Checklists", url: createPageUrl("DailyChecklists") },
      { title: "Checklist Builder", url: createPageUrl("ChecklistBuilder") },
    ]
  },
  {
    category: "🍽️ Menu & Food",
    items: [
      { title: "Menu Management", url: createPageUrl("MenuManagement") },
      { title: "Menu Analysis", url: createPageUrl("MenuAnalysis") },
      { title: "Allergen Table", url: createPageUrl("AllergyTable") },
      { title: "Menu Intelligence", url: createPageUrl("MenuIntelligence") },
      { title: "Supplier Management", url: createPageUrl("SupplierManagement") },
      { title: "Production Planning", url: createPageUrl("ProductionPlanning") },
      { title: "Ordering", url: createPageUrl("Ordering") },
      { title: "Order History", url: createPageUrl("OrderHistory") },
    ]
  },
  {
    category: "👥 Staff & Scheduling",
    items: [
      { title: "Staff Rota", url: createPageUrl("StaffRota") },
      { title: "My Shifts", url: createPageUrl("MyShifts") },
      { title: "Clock In/Out", url: createPageUrl("ClockInOut") },
      { title: "My Tasks", url: createPageUrl("MyTasks") },
      { title: "Shift Templates", url: createPageUrl("ShiftTemplates") },
      { title: "AI Rota Generator", url: createPageUrl("AIRotaGenerator") },
      { title: "Manage Availability", url: createPageUrl("ManageAvailability") },
      { title: "Attendance Reports", url: createPageUrl("AttendanceReports") },
      { title: "Attendance Approval", url: createPageUrl("AttendanceApproval") },
      { title: "My Attendance", url: createPageUrl("MyAttendance") },
      { title: "Team Directory", url: createPageUrl("TeamDirectory") },
    ]
  },
  {
    category: "🎓 Training & Growth",
    items: [
      { title: "Onboarding & Training", url: createPageUrl("OnboardingTraining") },
      { title: "Culture Building", url: createPageUrl("CultureBuilding") },
      { title: "Performance & Growth", url: createPageUrl("PerformanceGrowth") },
      { title: "My Coaching", url: createPageUrl("MyCoaching") },
      { title: "Coaching Dashboard", url: createPageUrl("CoachingDashboard") },
      { title: "Self Reflection", url: createPageUrl("SelfReflection") },
      { title: "Growth Tracker", url: createPageUrl("GrowthTracker") },
    ]
  },
  {
    category: "💬 Communication",
    items: [
      { title: "Team Chat", url: createPageUrl("TeamChat") },
      { title: "Announcements", url: createPageUrl("Announcements") },
      { title: "Suggestion Box", url: createPageUrl("SuggestionBox") },
      { title: "Communication Hub", url: createPageUrl("CommunicationFeedback") },
      { title: "Meeting Dashboard", url: createPageUrl("MeetingDashboard") },
    ]
  },
  {
    category: "🛠️ Maintenance & Equipment",
    items: [
      { title: "Maintenance Tickets", url: createPageUrl("Maintenance") },
      { title: "Equipment Tracking", url: createPageUrl("InventoryManagement") },
    ]
  },
  {
    category: "🧠 AI & Intelligence",
    items: [
      { title: "AI Hub", url: createPageUrl("AIHub") },
      { title: "AURA Brain", url: createPageUrl("AuraBrainDashboard") },
      { title: "AI Console", url: createPageUrl("AIConsole") },
      { title: "AURA Intelligence", url: createPageUrl("AuraIntelligence") },
      { title: "Analytics Dashboard", url: createPageUrl("AnalyticsDashboard") },
      { title: "Event Hub", url: createPageUrl("EventHub") },
    ]
  },
  {
    category: "🛡️ Compliance & Security",
    items: [
      { title: "Compliance Dashboard", url: createPageUrl("ComplianceDashboard") },
      { title: "Compliance Core", url: createPageUrl("ComplianceCore") },
      { title: "Compliance Checks", url: createPageUrl("Compliance") },
      { title: "Hygiene Dashboard", url: createPageUrl("HygieneDashboard") },
      { title: "EHO Control Center", url: createPageUrl("EHOControlCenter") },
      { title: "Privacy Center", url: createPageUrl("PrivacyCenter") },
      { title: "Security Dashboard", url: createPageUrl("SecurityDashboard") },
      { title: "System Protection", url: createPageUrl("SystemProtection") },
    ]
  },
  {
    category: "💰 Payroll & Finance",
    items: [
      { title: "Payroll Dashboard", url: createPageUrl("PayrollDashboard") },
      { title: "Weekly Payroll Report", url: createPageUrl("WeeklyPayrollReport") },
      { title: "Staff Wages Report", url: createPageUrl("StaffWagesReport") },
      { title: "Cost Analytics", url: createPageUrl("CostAnalyticsDashboard") },
    ]
  },
  {
    category: "⚙️ Settings & Admin",
    items: [
      { title: "Settings Dashboard", url: createPageUrl("SettingsDashboard") },
      { title: "Manager Dashboard", url: createPageUrl("ManagerDashboard") },
      { title: "User Management", url: createPageUrl("UserManagement") },
      { title: "Data Management", url: createPageUrl("DataManagement") },
      { title: "Backup Settings", url: createPageUrl("BackupSettings") },
      { title: "System Health Check", url: createPageUrl("SystemHealthCheck") },
      { title: "Data Bridge Monitor", url: createPageUrl("DataBridgeMonitor") },
    ]
  },
  {
    category: "🐛 Support & Feedback",
    items: [
      { title: "Bug Report", url: createPageUrl("BugReport") },
      { title: "Feature Ideas", url: createPageUrl("FeatureIdeas") },
      { title: "Feature List", url: createPageUrl("FeatureList") },
    ]
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
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

        {/* Main Navigation */}
        <div className="p-3">
          <div className="space-y-1">
            {mainNavigation.map((item) => {
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

          {/* Other Tools Dropdown */}
          <div className="mt-4">
            <button
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Other Tools</span>
              </div>
              {toolsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {toolsExpanded && (
              <div className="mt-2 ml-4 space-y-2">
                {otherTools.map((section) => (
                  <div key={section.category}>
                    <button
                      onClick={() => toggleCategory(section.category)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <span className="font-medium">{section.category}</span>
                      {expandedCategories[section.category] ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>

                    {expandedCategories[section.category] && (
                      <div className="ml-4 space-y-1">
                        {section.items.map((item) => {
                          const isActive = location.pathname === item.url;
                          return (
                            <Link
                              key={item.title}
                              to={item.url}
                              onClick={() => setSidebarOpen(false)}
                              className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 font-medium"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                            >
                              {item.title}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 mt-auto">
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
                    {user.position || "Staff"}
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
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}