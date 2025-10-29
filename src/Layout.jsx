import React, { useState, useEffect } from "react";
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
  Menu,
  X,
  FileText,
  Calendar,
  CheckCircle,
  Star,
  Activity,
  Database,
  Shield,
  BookOpen,
  Target,
  Zap,
  Clock,
  Award,
  Briefcase,
  MessageCircle,
  GraduationCap,
  FilePlus,
  Brain,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
  // Forms & Checklists
  {
    title: "Form Intelligence",
    url: createPageUrl("FormIntelligence"),
    icon: FileText,
  },
  {
    title: "Form Builder",
    url: createPageUrl("FormBuilder"),
    icon: FilePlus,
  },
  {
    title: "Form Library",
    url: createPageUrl("FormLibrary"),
    icon: BookOpen,
  },
  {
    title: "Checklist Templates",
    url: createPageUrl("ChecklistTemplates"),
    icon: CheckCircle,
  },
  {
    title: "My Checklists",
    url: createPageUrl("MyChecklists"),
    icon: ClipboardCheck,
  },
  {
    title: "Daily Checklists",
    url: createPageUrl("DailyChecklists"),
    icon: Calendar,
  },
  // Quality & Hygiene
  {
    title: "Quality Dashboard",
    url: createPageUrl("QualityDashboard"),
    icon: Star,
  },
  {
    title: "Hygiene Dashboard",
    url: createPageUrl("HygieneDashboard"),
    icon: Activity,
  },
  // SOPs & Documents
  {
    title: "SOP Dashboard",
    url: createPageUrl("SOPDashboard"),
    icon: BookOpen,
  },
  {
    title: "SOP Builder",
    url: createPageUrl("SOPBuilder"),
    icon: Zap,
  },
  {
    title: "Document Management",
    url: createPageUrl("DocumentManagement"),
    icon: Database,
  },
  {
    title: "Document Builder",
    url: createPageUrl("DocumentBuilder"),
    icon: FilePlus,
  },
  // Scheduling & Staff
  {
    title: "Smart Scheduler",
    url: createPageUrl("SmartScheduler"),
    icon: Calendar,
  },
  {
    title: "My Shifts",
    url: createPageUrl("MyShifts"),
    icon: Clock,
  },
  {
    title: "Clock In/Out",
    url: createPageUrl("ClockInOut"),
    icon: Clock,
  },
  {
    title: "Attendance Reports",
    url: createPageUrl("AttendanceReports"),
    icon: CheckCircle,
  },
  // Performance & Coaching
  {
    title: "Coaching Dashboard",
    url: createPageUrl("CoachingDashboard"),
    icon: GraduationCap,
  },
  {
    title: "My Coaching",
    url: createPageUrl("MyCoaching"),
    icon: Award,
  },
  {
    title: "Performance Dashboard",
    url: createPageUrl("PerformanceDashboard"),
    icon: Target,
  },
  // Operations
  {
    title: "Operations Core",
    url: createPageUrl("OperationsCore"),
    icon: Target,
  },
  {
    title: "My Tasks",
    url: createPageUrl("MyTasks"),
    icon: CheckCircle,
  },
  // Menu & Inventory
  {
    title: "Menu Management",
    url: createPageUrl("MenuManagement"),
    icon: BookOpen,
  },
  {
    title: "Inventory Management",
    url: createPageUrl("InventoryManagement"),
    icon: Package,
  },
  {
    title: "Supplier Management",
    url: createPageUrl("SupplierManagement"),
    icon: Briefcase,
  },
  // Compliance & Security
  {
    title: "Compliance Core",
    url: createPageUrl("ComplianceCore"),
    icon: Shield,
  },
  {
    title: "Privacy Center",
    url: createPageUrl("PrivacyCenter"),
    icon: Shield,
  },
  {
    title: "Security Dashboard",
    url: createPageUrl("SecurityDashboard"),
    icon: Shield,
  },
  // Communication
  {
    title: "Team Chat",
    url: createPageUrl("TeamChat"),
    icon: MessageCircle,
  },
  {
    title: "Announcements",
    url: createPageUrl("Announcements"),
    icon: MessageCircle,
  },
  {
    title: "Team Directory",
    url: createPageUrl("TeamDirectory"),
    icon: Users,
  },
  // Payroll
  {
    title: "Payroll Dashboard",
    url: createPageUrl("PayrollDashboard"),
    icon: CreditCard,
  },
  // AI & Analytics
  {
    title: "AI Hub",
    url: createPageUrl("AIHub"),
    icon: Brain,
  },
  {
    title: "Analytics Dashboard",
    url: createPageUrl("AnalyticsDashboard"),
    icon: BarChart3,
  },
  {
    title: "Event Hub",
    url: createPageUrl("EventHub"),
    icon: Activity,
  },
  // Admin
  {
    title: "Manager Dashboard",
    url: createPageUrl("ManagerDashboard"),
    icon: Briefcase,
  },
  {
    title: "Data Management",
    url: createPageUrl("DataManagement"),
    icon: Database,
  },
  {
    title: "User Management",
    url: createPageUrl("UserManagement"),
    icon: Users,
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [otherToolsOpen, setOtherToolsOpen] = useState(false);

  useEffect(() => {
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

  return (
    <SidebarProvider>
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
      `}</style>
      
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-900">AURA</h2>
                <p className="text-xs text-gray-500">Restaurant Assistant</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3 overflow-y-auto">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`
                            transition-all duration-200 rounded-xl px-4 py-3
                            ${isActive 
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200' 
                              : 'hover:bg-gray-50 text-gray-700'
                            }
                          `}
                        >
                          <Link to={item.url} className="flex items-center gap-3">
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {/* Other Tools Expandable Section */}
                  <SidebarMenuItem>
                    <button
                      onClick={() => setOtherToolsOpen(!otherToolsOpen)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">Other Tools</span>
                      </div>
                      {otherToolsOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </SidebarMenuItem>

                  {/* Other Tools Submenu */}
                  {otherToolsOpen && (
                    <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                      {otherToolsItems.map((item) => {
                        const isActive = location.pathname === item.url;
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                              asChild 
                              className={`
                                transition-all duration-200 rounded-lg px-3 py-2 text-sm
                                ${isActive 
                                  ? 'bg-blue-50 text-blue-700 font-medium' 
                                  : 'hover:bg-gray-50 text-gray-600'
                                }
                              `}
                            >
                              <Link to={item.url} className="flex items-center gap-2">
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-100 p-4">
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
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-gray-900">AURA</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}