import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Wrench,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  FileText,
  GraduationCap,
  MessageCircle,
  Shield,
  Activity,
  Star,
  BookOpen,
  Briefcase,
  Clock,
  DollarSign,
  Database,
  Bell,
  Camera,
  Edit,
  CheckCircle,
  Target,
  Brain,
  TrendingUp,
  Utensils,
  MoreHorizontal
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Compliance",
    url: createPageUrl("Compliance"),
    icon: ClipboardCheck,
  },
  {
    title: "Inventory",
    url: createPageUrl("Inventory"),
    icon: Package,
  },
  {
    title: "Maintenance",
    url: createPageUrl("Maintenance"),
    icon: Wrench,
  },
  {
    title: "Staff",
    url: createPageUrl("Staff"),
    icon: Users,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
  },
];

const otherToolsItems = [
  {
    section: "Operations",
    items: [
      { title: "Operations Dashboard", url: createPageUrl("OperationsDashboard"), icon: Target },
      { title: "Operations Core", url: createPageUrl("OperationsCore"), icon: Activity },
      { title: "Create Operation Task", url: createPageUrl("CreateOperationTask"), icon: CheckCircle },
      { title: "My Tasks", url: createPageUrl("MyTasks"), icon: CheckCircle },
      { title: "Task Reports", url: createPageUrl("TaskReports"), icon: BarChart3 },
      { title: "Event Hub", url: createPageUrl("EventHub"), icon: Bell },
      { title: "Event Feed", url: createPageUrl("EventFeed"), icon: Activity },
    ]
  },
  {
    section: "Checklists & Forms",
    items: [
      { title: "Form Intelligence", url: createPageUrl("FormIntelligence"), icon: Brain },
      { title: "Form Builder", url: createPageUrl("FormBuilder"), icon: Edit },
      { title: "Form Library", url: createPageUrl("FormLibrary"), icon: BookOpen },
      { title: "Form Scheduler", url: createPageUrl("FormScheduler"), icon: Calendar },
      { title: "My Checklists", url: createPageUrl("MyChecklists"), icon: ClipboardCheck },
      { title: "Daily Checklists", url: createPageUrl("DailyChecklists"), icon: CheckCircle },
      { title: "Active Checklist", url: createPageUrl("ActiveChecklist"), icon: Activity },
      { title: "Checklist Builder", url: createPageUrl("ChecklistBuilder"), icon: Edit },
      { title: "Checklist Templates", url: createPageUrl("ChecklistTemplates"), icon: BookOpen },
      { title: "Checklist Monitor", url: createPageUrl("ChecklistMonitor"), icon: Activity },
      { title: "Execute Checklist", url: createPageUrl("ExecuteChecklist"), icon: CheckCircle },
      { title: "Restaurant Routines", url: createPageUrl("RestaurantRoutines"), icon: Clock },
    ]
  },
  {
    section: "Staff & Scheduling",
    items: [
      { title: "Staff Dashboard", url: createPageUrl("StaffDashboard"), icon: Users },
      { title: "Smart Scheduler", url: createPageUrl("SmartScheduler"), icon: Calendar },
      { title: "AI Rota Generator", url: createPageUrl("AIRotaGenerator"), icon: Brain },
      { title: "Shift Templates", url: createPageUrl("ShiftTemplates"), icon: BookOpen },
      { title: "Staff Rota", url: createPageUrl("StaffRota"), icon: Calendar },
      { title: "Weekly Rota", url: createPageUrl("WeeklyRota"), icon: Calendar },
      { title: "My Shifts", url: createPageUrl("MyShifts"), icon: Calendar },
      { title: "Clock In/Out", url: createPageUrl("ClockInOut"), icon: Clock },
      { title: "Manage Availability", url: createPageUrl("ManageAvailability"), icon: Calendar },
      { title: "Attendance Reports", url: createPageUrl("AttendanceReports"), icon: BarChart3 },
      { title: "Attendance Approval", url: createPageUrl("AttendanceApproval"), icon: CheckCircle },
      { title: "My Attendance", url: createPageUrl("MyAttendance"), icon: Clock },
      { title: "Staff Profile", url: createPageUrl("StaffProfile"), icon: Users },
      { title: "Team Directory", url: createPageUrl("TeamDirectory"), icon: Users },
    ]
  },
  {
    section: "Menu & Inventory",
    items: [
      { title: "Inventory Dashboard", url: createPageUrl("InventoryDashboard"), icon: Package },
      { title: "Inventory Management", url: createPageUrl("InventoryManagement"), icon: Package },
      { title: "AI Stock Verification", url: createPageUrl("AIStockVerification"), icon: Brain },
      { title: "Menu Management", url: createPageUrl("MenuManagement"), icon: Utensils },
      { title: "Menu", url: createPageUrl("Menu"), icon: Utensils },
      { title: "Menu Intelligence", url: createPageUrl("MenuIntelligence"), icon: Brain },
      { title: "Menu Analysis", url: createPageUrl("MenuAnalysis"), icon: BarChart3 },
      { title: "Menu Item View", url: createPageUrl("MenuItemView"), icon: Utensils },
      { title: "Allergy Table", url: createPageUrl("AllergyTable"), icon: Shield },
      { title: "Supplier Management", url: createPageUrl("SupplierManagement"), icon: Briefcase },
      { title: "Supplier Catalog Import", url: createPageUrl("SupplierCatalogImport"), icon: Package },
      { title: "Ingredient Stock", url: createPageUrl("IngredientStock"), icon: Package },
      { title: "Production Planning", url: createPageUrl("ProductionPlanning"), icon: Target },
      { title: "Ordering", url: createPageUrl("Ordering"), icon: ShoppingCart },
      { title: "Order History", url: createPageUrl("OrderHistory"), icon: Clock },
    ]
  },
  {
    section: "Quality & Hygiene",
    items: [
      { title: "Quality Dashboard", url: createPageUrl("QualityDashboard"), icon: Star },
      { title: "Quick Quality Check", url: createPageUrl("QuickQualityCheck"), icon: CheckCircle },
      { title: "Quality Templates", url: createPageUrl("QualityTemplates"), icon: BookOpen },
      { title: "Quality Reports", url: createPageUrl("QualityReports"), icon: BarChart3 },
      { title: "Quality Form Execution", url: createPageUrl("QualityFormExecution"), icon: Edit },
      { title: "Hygiene Dashboard", url: createPageUrl("HygieneDashboard"), icon: Activity },
      { title: "EHO Control Center", url: createPageUrl("EHOControlCenter"), icon: Shield },
      { title: "Leafe Dashboard", url: createPageUrl("LeafeDashboard"), icon: Activity },
      { title: "Leafe Venues", url: createPageUrl("LeafeVenues"), icon: Briefcase },
    ]
  },
  {
    section: "SOPs & Documents",
    items: [
      { title: "SOP Dashboard", url: createPageUrl("SOPDashboardHub"), icon: FileText },
      { title: "SOP Core", url: createPageUrl("SOPCore"), icon: BookOpen },
      { title: "SOP Builder", url: createPageUrl("SOPBuilder"), icon: Edit },
      { title: "SOP Viewer", url: createPageUrl("SOPViewer"), icon: FileText },
      { title: "SOP Voice Mode", url: createPageUrl("SOPVoiceMode"), icon: MessageCircle },
      { title: "SOP Certifications", url: createPageUrl("SOPCertifications"), icon: Shield },
      { title: "Documents Dashboard", url: createPageUrl("DocumentsDashboard"), icon: FileText },
      { title: "Document Management", url: createPageUrl("DocumentManagement"), icon: FileText },
      { title: "Document Builder", url: createPageUrl("DocumentBuilder"), icon: Edit },
      { title: "Document Library", url: createPageUrl("DocumentLibrary"), icon: BookOpen },
      { title: "Document Viewer", url: createPageUrl("DocumentViewer"), icon: FileText },
      { title: "Document Signature Report", url: createPageUrl("DocumentSignatureReport"), icon: CheckCircle },
    ]
  },
  {
    section: "Training & Coaching",
    items: [
      { title: "Onboarding & Training", url: createPageUrl("OnboardingTraining"), icon: GraduationCap },
      { title: "Culture Building", url: createPageUrl("CultureBuilding"), icon: Users },
      { title: "Performance & Growth", url: createPageUrl("PerformanceGrowth"), icon: TrendingUp },
      { title: "Coaching Dashboard", url: createPageUrl("CoachingDashboard"), icon: GraduationCap },
      { title: "My Coaching", url: createPageUrl("MyCoaching"), icon: GraduationCap },
      { title: "Start Coaching Session", url: createPageUrl("StartCoachingSession"), icon: MessageCircle },
      { title: "Self Reflection", url: createPageUrl("SelfReflection"), icon: Edit },
      { title: "Growth Tracker", url: createPageUrl("GrowthTracker"), icon: TrendingUp },
      { title: "Coaching Achievements", url: createPageUrl("CoachingAchievements"), icon: Star },
      { title: "Schedule Coaching", url: createPageUrl("ScheduleCoaching"), icon: Calendar },
      { title: "Performance Dashboard", url: createPageUrl("PerformanceDashboard"), icon: TrendingUp },
    ]
  },
  {
    section: "Communication",
    items: [
      { title: "Communication & Feedback", url: createPageUrl("CommunicationFeedback"), icon: MessageCircle },
      { title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageCircle },
      { title: "Announcements", url: createPageUrl("Announcements"), icon: Bell },
      { title: "Suggestion Box", url: createPageUrl("SuggestionBox"), icon: Edit },
      { title: "Meeting Dashboard", url: createPageUrl("MeetingDashboard"), icon: Calendar },
    ]
  },
  {
    section: "Compliance & Security",
    items: [
      { title: "Compliance Dashboard", url: createPageUrl("ComplianceDashboard"), icon: Shield },
      { title: "Compliance Core", url: createPageUrl("ComplianceCore"), icon: Shield },
      { title: "Privacy Center", url: createPageUrl("PrivacyCenter"), icon: Shield },
      { title: "Email Integration Hub", url: createPageUrl("EmailIntegrationHub"), icon: MessageCircle },
      { title: "Security Dashboard", url: createPageUrl("SecurityDashboard"), icon: Shield },
      { title: "System Protection", url: createPageUrl("SystemProtection"), icon: Shield },
    ]
  },
  {
    section: "Analytics & AI",
    items: [
      { title: "AI Hub", url: createPageUrl("AIHub"), icon: Brain },
      { title: "AURA Brain Dashboard", url: createPageUrl("AuraBrainDashboard"), icon: Brain },
      { title: "AURA Intelligence", url: createPageUrl("AuraIntelligence"), icon: Brain },
      { title: "AI Console", url: createPageUrl("AIConsole"), icon: Brain },
      { title: "Analytics Dashboard", url: createPageUrl("AnalyticsDashboard"), icon: BarChart3 },
      { title: "Cost Analytics Dashboard", url: createPageUrl("CostAnalyticsDashboard"), icon: DollarSign },
    ]
  },
  {
    section: "Payroll & Finance",
    items: [
      { title: "Payroll Dashboard", url: createPageUrl("PayrollDashboard"), icon: DollarSign },
      { title: "Weekly Payroll Report", url: createPageUrl("WeeklyPayrollReport"), icon: BarChart3 },
      { title: "Staff Wages Report", url: createPageUrl("StaffWagesReport"), icon: DollarSign },
    ]
  },
  {
    section: "Management & Settings",
    items: [
      { title: "Manager Dashboard", url: createPageUrl("ManagerDashboard"), icon: Briefcase },
      { title: "Settings Dashboard", url: createPageUrl("SettingsDashboard"), icon: Settings },
      { title: "User Management", url: createPageUrl("UserManagement"), icon: Users },
      { title: "Data Management", url: createPageUrl("DataManagement"), icon: Database },
      { title: "Backup Settings", url: createPageUrl("BackupSettings"), icon: Database },
      { title: "Data Bridge Monitor", url: createPageUrl("DataBridgeMonitor"), icon: Activity },
      { title: "System Health Check", url: createPageUrl("SystemHealthCheck"), icon: Activity },
    ]
  },
  {
    section: "Feedback & Support",
    items: [
      { title: "Feature List", url: createPageUrl("FeatureList"), icon: BookOpen },
      { title: "Bug Report", url: createPageUrl("BugReport"), icon: AlertTriangle },
      { title: "Feature Ideas", url: createPageUrl("FeatureIdeas"), icon: Edit },
    ]
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <style>{`
        :root {
          --primary-dark: #0f172a;
          --primary-blue: #1e40af;
          --accent-blue: #3b82f6;
          --bg-light: #f8fafc;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border-color: #e2e8f0;
        }
        
        body {
          background: var(--bg-light);
        }

        .sidebar-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 w-72 overflow-y-auto sidebar-scrollbar
      `}>
        {/* Header */}
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-900">AURA</h2>
              <p className="text-xs text-gray-500">Restaurant Assistant</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3">
          {/* Main Navigation */}
          <div className="space-y-1 mb-4">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200' 
                      : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>

          {/* Other Tools Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="px-2 mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <MoreHorizontal className="w-4 h-4" />
                Other Tools
              </h3>
            </div>

            {otherToolsItems.map((section) => (
              <div key={section.section} className="mb-2">
                <button
                  onClick={() => toggleSection(section.section)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span>{section.section}</span>
                  {expandedSections[section.section] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {expandedSections[section.section] && (
                  <div className="mt-1 space-y-1 ml-2">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <Link
                          key={item.title}
                          to={item.url}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                            ${isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-50'
                            }
                          `}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 mt-auto">
          {user && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.position || 'Staff'}</p>
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

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-72">
        {/* Mobile header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 lg:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
            <h1 className="text-xl font-bold text-gray-900">AURA</h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}