import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Shield, TrendingUp, Users, Package, ChefHat, 
  Calendar, ClipboardCheck, Wrench, GraduationCap, MessageCircle,
  FileText, Database, Activity, BarChart3, Clock, Award,
  ShoppingCart, Calculator, Truck, Utensils, ThermometerSun,
  CheckCircle, Target, Mic, Brain, Zap, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const featureCategories = [
  {
    category: "🤖 AI-POWERED INTELLIGENCE",
    color: "from-purple-500 to-pink-500",
    description: "Advanced AI automation that learns and adapts to your restaurant",
    features: [
      {
        icon: Sparkles,
        name: "Hey AURA - AI Console",
        description: "Natural language AI assistant that answers questions, generates reports, and provides real-time insights about your restaurant operations.",
        why: "Voice-activated control of your entire restaurant system - just ask AURA anything!",
        link: "AIConsole"
      },
      {
        icon: Mic,
        name: "Meeting Intelligence",
        description: "Record team meetings, auto-transcribe, extract action items, and create tasks automatically. AI identifies key decisions and assigns follow-ups.",
        why: "Never lose track of what was discussed - AI converts meetings into actionable tasks instantly.",
        link: "MeetingDashboard"
      },
      {
        icon: Brain,
        name: "Menu Intelligence",
        description: "AI analyzes your menu performance, suggests pricing optimizations, identifies top sellers, and recommends items to promote or remove.",
        why: "Data-driven menu decisions that maximize profitability automatically.",
        link: "MenuIntelligence"
      },
      {
        icon: Zap,
        name: "Form Intelligence Engine",
        description: "Smart form assignment system that auto-detects when forms are due, assigns to correct staff based on role/shift, and sends reminders.",
        why: "Forms complete themselves - staff see exactly what needs doing, when, without manager micromanagement.",
        link: "FormIntelligence"
      },
      {
        icon: Calendar,
        name: "Smart Gantt Scheduler",
        description: "AI-powered visual week planner that automatically generates shift schedules, assigns tasks by role, and optimizes staff coverage.",
        why: "One-click scheduling that considers availability, skills, and labor costs automatically.",
        link: "SmartScheduler"
      },
      {
        icon: FileText,
        name: "SOP AI Generator",
        description: "Create professional Standard Operating Procedures instantly by describing what you need - AI writes detailed step-by-step guides.",
        why: "Build a complete operations manual in hours, not months.",
        link: "SOPBuilder"
      },
    ]
  },
  {
    category: "📋 COMPLIANCE & HYGIENE",
    color: "from-green-500 to-emerald-500",
    description: "EHO-ready compliance tracking with automatic scoring and alerts",
    features: [
      {
        icon: ThermometerSun,
        name: "Hygiene Central",
        description: "Complete temperature logging, cleaning checklists, and hygiene tracking with automatic alerts for out-of-range readings. Includes gamification with points and badges.",
        why: "Pass every EHO inspection - real-time monitoring ensures nothing is missed.",
        link: "HygieneDashboard"
      },
      {
        icon: ClipboardCheck,
        name: "Compliance Checks",
        description: "Digital compliance checklists for temperature logs, cleaning, hygiene audits, and safety inspections with photo evidence and signatures.",
        why: "Paperless compliance with full audit trail - prove your standards to inspectors instantly.",
        link: "Compliance"
      },
      {
        icon: Shield,
        name: "EHO Control Center",
        description: "Comprehensive EHO audit preparation dashboard with FSA ratings, corrective actions tracker, and inspection history.",
        why: "Always audit-ready - live view of your compliance status across all categories.",
        link: "EHOControlCenter"
      },
      {
        icon: FileText,
        name: "Form Intelligence",
        description: "Smart compliance forms (HACCP, cleaning schedules, equipment checks) that auto-assign based on shifts and roles.",
        why: "Never miss a required check - forms appear automatically when needed.",
        link: "FormIntelligence"
      },
      {
        icon: Activity,
        name: "Leafe Score System",
        description: "Internal hygiene scoring system that tracks performance across venues, calculates rankings, and shows trends over time.",
        why: "Turn compliance into a competition - staff see real-time hygiene scores and rankings.",
        link: "LeafeDashboard"
      },
    ]
  },
  {
    category: "🍽️ MENU & INVENTORY",
    color: "from-amber-500 to-orange-500",
    description: "Complete menu costing, inventory control, and automatic ordering",
    features: [
      {
        icon: ChefHat,
        name: "Menu Management",
        description: "Create menu items with photos, recipes, ingredient costs, and automatic food cost percentage calculation. Link SOPs for consistent preparation.",
        why: "Know the exact cost and profit of every dish - make data-driven menu decisions.",
        link: "MenuManagement"
      },
      {
        icon: BarChart3,
        name: "Menu Analysis",
        description: "Profitability dashboard showing food cost %, profit margins, and menu item performance with visual charts.",
        why: "Instantly identify your most and least profitable dishes.",
        link: "MenuAnalysis"
      },
      {
        icon: Calculator,
        name: "Profit Calculator",
        description: "Calculate exact costs for multiple servings, adjust for waste percentage, and create purchase orders directly from menu items.",
        why: "Plan catering events and large orders with precise cost forecasting.",
        link: "MenuManagement"
      },
      {
        icon: Package,
        name: "Stock Management",
        description: "Track ingredient inventory with automatic reorder alerts when stock hits par levels. Real-time stock updates on orders.",
        why: "Never run out of key ingredients - automated reorder points prevent stockouts.",
        link: "InventoryManagement"
      },
      {
        icon: Truck,
        name: "Supplier Management",
        description: "Manage supplier contacts, pricing, delivery schedules, and link ingredients to specific suppliers for easy ordering.",
        why: "One-click ordering to the right supplier - all contact info and pricing in one place.",
        link: "SupplierManagement"
      },
      {
        icon: ShoppingCart,
        name: "Smart Ordering System",
        description: "Create purchase orders with shopping cart, email directly to suppliers via Gmail integration, track delivery status, and verify receipts.",
        why: "Paperless ordering with full tracking - from cart to kitchen in clicks.",
        link: "Ordering"
      },
      {
        icon: FileText,
        name: "Order History",
        description: "Complete order tracking with status updates (draft → sent → delivered → verified), delivery photos, and invoice management.",
        why: "Full visibility of every order - track spending and resolve delivery issues fast.",
        link: "OrderHistory"
      },
      {
        icon: Calculator,
        name: "Production Planning",
        description: "Plan menu production for events/services, calculate ingredient requirements, and automatically generate purchase orders.",
        why: "Cater for 100 guests with confidence - system calculates exactly what you need.",
        link: "ProductionPlanning"
      },
      {
        icon: Shield,
        name: "Allergen Compliance",
        description: "Automatic allergen tracking from ingredients to finished dishes. Auto-generates allergen tables for EHO compliance.",
        why: "Legal allergen compliance on autopilot - system tracks all 14 major allergens automatically.",
        link: "AllergyTable"
      },
    ]
  },
  {
    category: "👥 STAFF & WORKFORCE",
    color: "from-blue-500 to-indigo-500",
    description: "Complete staff management, scheduling, and performance tracking",
    features: [
      {
        icon: Users,
        name: "Staff Directory",
        description: "Centralized staff profiles with positions, departments, contact info, certifications, and hire dates.",
        why: "All staff information in one searchable database.",
        link: "TeamDirectory"
      },
      {
        icon: Calendar,
        name: "Shift & Rota Management",
        description: "Visual shift scheduling with drag-and-drop, availability management, and shift templates. Staff can view their schedules on mobile.",
        why: "End scheduling chaos - visual drag-and-drop makes rota building effortless.",
        link: "StaffRota"
      },
      {
        icon: Clock,
        name: "Clock In/Out System",
        description: "Digital clock in/out with GPS location tracking, photo verification, and automatic attendance logging. Alerts managers of late arrivals.",
        why: "Accurate time tracking prevents wage disputes - GPS proves staff were on-site.",
        link: "ClockInOut"
      },
      {
        icon: CheckCircle,
        name: "Attendance Tracking",
        description: "Automatic attendance records with lateness tracking, overtime calculation, and manager alerts for missed clock-ins.",
        why: "Real-time attendance monitoring - spot patterns and address issues immediately.",
        link: "AttendanceReports"
      },
      {
        icon: Target,
        name: "Task Management",
        description: "Auto-generated daily tasks based on role and shift type (opening/closing checklists). Staff see their to-do list, managers monitor completion.",
        why: "Staff never wonder what to do - tasks appear automatically based on their shift.",
        link: "MyTasks"
      },
      {
        icon: FileText,
        name: "Role Responsibilities",
        description: "Define daily, weekly, and monthly tasks for each position. System auto-assigns tasks when staff clock in.",
        why: "Consistent standards across all staff - everyone knows their exact responsibilities.",
        link: "RestaurantRoutines"
      },
    ]
  },
  {
    category: "📈 PERFORMANCE & GROWTH",
    color: "from-purple-500 to-pink-500",
    description: "Staff development, coaching, and performance management",
    features: [
      {
        icon: GraduationCap,
        name: "Onboarding & Training",
        description: "Step-by-step onboarding with document uploads, training modules, quizzes, and completion certificates. Track progress per staff member.",
        why: "New hires become productive faster - structured onboarding ensures nothing is missed.",
        link: "OnboardingTraining"
      },
      {
        icon: Award,
        name: "Performance Reviews",
        description: "Structured review system with scoring (punctuality, cleanliness, service, teamwork), goal setting, and badge rewards.",
        why: "Fair, transparent performance management - staff know exactly how they're doing.",
        link: "PerformanceGrowth"
      },
      {
        icon: TrendingUp,
        name: "Coaching System",
        description: "Regular coaching sessions with self-reflection forms, manager feedback, goal tracking, and achievement badges. Visual growth charts.",
        why: "Develop your team systematically - structured coaching drives continuous improvement.",
        link: "CoachingDashboard"
      },
      {
        icon: Target,
        name: "My Coaching Journey",
        description: "Staff view their own coaching history, completed sessions, goals, badges earned, and performance trends.",
        why: "Staff own their development - visual progress tracking motivates improvement.",
        link: "MyCoaching"
      },
      {
        icon: Award,
        name: "Recognition & Rewards",
        description: "Digital badges, peer recognition, staff of the month, and gamification points for achievements.",
        why: "Celebrate wins publicly - recognition boosts morale and retention.",
        link: "CoachingAchievements"
      },
      {
        icon: MessageCircle,
        name: "Team Chat",
        description: "Department-based chat rooms, direct messages, announcements, file sharing, and message translation.",
        why: "Instant team communication - replace WhatsApp with professional, organized chat.",
        link: "TeamChat"
      },
      {
        icon: MessageCircle,
        name: "Suggestion Box",
        description: "Anonymous staff suggestions with manager responses, voting system, and implementation tracking.",
        why: "Harness staff ideas - front-line workers often have the best solutions.",
        link: "SuggestionBox"
      },
    ]
  },
  {
    category: "📚 SOPs & PROCEDURES",
    color: "from-indigo-500 to-purple-500",
    description: "Digital operations manual with AI creation and voice mode",
    features: [
      {
        icon: FileText,
        name: "SOP Dashboard",
        description: "Central library of all Standard Operating Procedures organized by category (kitchen, service, cleaning, equipment, etc.).",
        why: "Your entire operations manual in one searchable place.",
        link: "SOPDashboard"
      },
      {
        icon: Sparkles,
        name: "AI SOP Generator",
        description: "Describe what you need, AI writes a complete SOP with step-by-step instructions, equipment lists, safety notes, and time estimates.",
        why: "Create professional SOPs in minutes - AI does the writing, you do the reviewing.",
        link: "SOPBuilder"
      },
      {
        icon: Mic,
        name: "Voice Mode SOP Viewer",
        description: "Hands-free SOP reading with text-to-speech. Perfect for following procedures while working.",
        why: "Keep hands clean and working - AURA reads instructions aloud while you cook/clean.",
        link: "SOPVoiceMode"
      },
      {
        icon: CheckCircle,
        name: "SOP Certifications",
        description: "Track which staff have read and signed each SOP. Automatic reminders for reviews every 6 months.",
        why: "Prove staff training for inspectors - digital signature trail for every procedure.",
        link: "SOPCertifications"
      },
      {
        icon: ChefHat,
        name: "Menu-SOP Linking",
        description: "Link SOPs directly to menu items so recipes and preparation procedures are always connected.",
        why: "Consistent dish quality - staff can view exact recipe SOP from menu item.",
        link: "MenuItemView"
      },
    ]
  },
  {
    category: "🔧 MAINTENANCE",
    color: "from-red-500 to-orange-500",
    description: "Equipment tracking and repair management (ROTOS)",
    features: [
      {
        icon: Wrench,
        name: "Maintenance Tickets",
        description: "Report equipment issues with photos, priority levels, and category tracking. Assign tickets, track status, and log resolutions.",
        why: "Never lose track of broken equipment - full repair history with photos.",
        link: "Maintenance"
      },
    ]
  },
  {
    category: "📊 REPORTS & ANALYTICS",
    color: "from-green-500 to-teal-500",
    description: "Data visualization and business intelligence",
    features: [
      {
        icon: BarChart3,
        name: "Manager Dashboard",
        description: "Comprehensive overview of operations: compliance rates, staff performance, inventory alerts, and task completion.",
        why: "Everything important on one screen - spot problems before they become crises.",
        link: "ManagerDashboard"
      },
      {
        icon: TrendingUp,
        name: "Reports & Analytics",
        description: "Compliance trends, inventory analysis, maintenance history, and task completion charts with CSV export.",
        why: "Data-driven decisions - spot trends and optimize operations.",
        link: "Reports"
      },
      {
        icon: Clock,
        name: "Payroll Reports",
        description: "Weekly staff hours, overtime tracking, performance-based bonuses, and wage calculations.",
        why: "Accurate payroll - automated calculations prevent wage errors.",
        link: "WeeklyPayrollReport"
      },
      {
        icon: Activity,
        name: "Performance Dashboard",
        description: "Team performance metrics, completion rates, hygiene scores, and staff rankings.",
        why: "Measure what matters - track team performance in real-time.",
        link: "PerformanceDashboard"
      },
    ]
  },
  {
    category: "🔒 SECURITY & COMPLIANCE",
    color: "from-gray-700 to-gray-900",
    description: "Enterprise-grade security with GDPR compliance",
    features: [
      {
        icon: Lock,
        name: "Role-Based Access Control (RBAC)",
        description: "Granular permissions system - Admin, Manager, Owner, Staff roles with different access levels to data and features.",
        why: "Protect sensitive data - staff only see what they need to see.",
        link: "SecurityDashboard"
      },
      {
        icon: Shield,
        name: "Row-Level Security (RLS)",
        description: "Every database table has access rules - staff can only view/edit their own records, managers control their team data.",
        why: "Bank-level security - impossible for staff to access unauthorized data.",
        link: "SecurityDashboard"
      },
      {
        icon: Database,
        name: "Automated Backups",
        description: "Scheduled automatic backups (twice daily/daily/weekly) with 30-day retention. One-click manual backups and restore.",
        why: "Sleep soundly - your data is automatically backed up and recoverable.",
        link: "DataManagement"
      },
      {
        icon: FileText,
        name: "Audit Logs",
        description: "Every data change is logged with user, timestamp, IP address, and what was changed. Full compliance trail.",
        why: "Complete accountability - track who did what, when, and from where.",
        link: "ComplianceDashboard"
      },
      {
        icon: Shield,
        name: "GDPR Compliance",
        description: "Data export, deletion requests, consent tracking, and privacy policy management built-in.",
        why: "Legal compliance made easy - GDPR tools included out of the box.",
        link: "PrivacyCenter"
      },
      {
        icon: Shield,
        name: "System Protection Mode",
        description: "Prevents accidental data deletion. Critical entities are locked from deletion without admin approval.",
        why: "Accident-proof your system - can't accidentally delete important data.",
        link: "SystemProtection"
      },
    ]
  },
  {
    category: "📧 INTEGRATIONS",
    color: "from-blue-600 to-cyan-500",
    description: "Connect with external services",
    features: [
      {
        icon: MessageCircle,
        name: "Gmail Integration",
        description: "Send purchase orders directly to suppliers via Gmail. Email logging for compliance.",
        why: "Professional emails from your domain - all communications tracked.",
        link: "EmailIntegrationHub"
      },
      {
        icon: Activity,
        name: "DataBridge System",
        description: "Internal event system that syncs data between modules (tasks → forms → checklists → shifts).",
        why: "Everything works together - change in one place updates everywhere automatically.",
        link: "DataBridgeMonitor"
      },
    ]
  },
  {
    category: "📱 MOBILE-FIRST DESIGN",
    color: "from-pink-500 to-rose-500",
    description: "Works perfectly on phones, tablets, and desktop",
    features: [
      {
        icon: Activity,
        name: "Responsive Design",
        description: "Every page adapts to screen size. Touch-friendly buttons, swipe gestures, and mobile-optimized forms.",
        why: "Staff use their phones - app works flawlessly on any device.",
        link: "Dashboard"
      },
      {
        icon: Clock,
        name: "GPS Clock-In",
        description: "Mobile GPS tracking ensures staff clock in from restaurant location.",
        why: "Prevent buddy punching - GPS proves staff are on-site.",
        link: "ClockInOut"
      },
    ]
  },
];

export default function FeatureList() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-[#014D40] via-emerald-600 to-[#E0B037] rounded-3xl shadow-2xl">
              <Sparkles className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#014D40] to-emerald-600 bg-clip-text text-transparent mb-4">
            AURA Complete Feature List
          </h1>
          <p className="text-2xl text-gray-600 font-medium mb-4">
            Restaurant Operations Assistant
          </p>
          <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
            The world's most comprehensive restaurant management system combining AI intelligence, 
            compliance tracking, inventory control, staff management, and performance coaching in one platform.
          </p>
        </div>

        {/* Why AURA is the Best */}
        <Card className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white border-none shadow-2xl mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Trophy className="w-10 h-10" />
              Why AURA is the Industry Leader
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-white/95">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">AI-First Design</h4>
                    <p className="text-white/90">Other systems are digital paper. AURA uses AI to think, predict, and automate - reducing manager workload by 70%.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Built for EHO Inspections</h4>
                    <p className="text-white/90">Automatic compliance tracking means you're always inspection-ready. Full audit trail proves your standards.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Everything Connects</h4>
                    <p className="text-white/90">One system, zero integrations needed. Menu → Inventory → Ordering → Tasks → Forms all sync automatically.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Staff Actually Use It</h4>
                    <p className="text-white/90">Beautiful mobile design, gamification, and voice mode mean staff love using AURA instead of avoiding it.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Bank-Level Security</h4>
                    <p className="text-white/90">GDPR compliant, automated backups, audit logs, and role-based access control protect your data.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Proven ROI</h4>
                    <p className="text-white/90">Reduce food waste 30%, cut labor costs 20%, increase staff retention 40%, and never fail an EHO inspection.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Categories */}
        <div className="space-y-12">
          {featureCategories.map((category, catIndex) => (
            <div key={catIndex}>
              <div className={`bg-gradient-to-r ${category.color} text-white rounded-2xl p-6 mb-6 shadow-xl`}>
                <h2 className="text-3xl font-bold mb-2">{category.category}</h2>
                <p className="text-white/90 text-lg">{category.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {category.features.map((feature, featureIndex) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={featureIndex} className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 group">
                      <CardHeader>
                        <CardTitle className="flex items-start gap-4">
                          <div className={`p-3 bg-gradient-to-br ${category.color} rounded-xl text-white group-hover:scale-110 transition-transform`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {feature.name}
                            </h3>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">What It Does:</p>
                          <p className="text-gray-700 leading-relaxed">{feature.description}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                          <p className="text-sm font-semibold text-green-900 mb-1">✅ Why It Matters:</p>
                          <p className="text-green-800 leading-relaxed">{feature.why}</p>
                        </div>
                        {feature.link && (
                          <Link to={createPageUrl(feature.link)}>
                            <Button className="w-full group-hover:shadow-lg transition-shadow">
                              Open Feature →
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <Card className="mt-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none shadow-2xl">
          <CardContent className="p-12">
            <h2 className="text-4xl font-bold text-center mb-8">AURA by the Numbers</h2>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-5xl font-bold mb-2">80+</p>
                <p className="text-white/90 text-lg">Core Features</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">12</p>
                <p className="text-white/90 text-lg">AI-Powered Modules</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">100%</p>
                <p className="text-white/90 text-lg">GDPR Compliant</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">0</p>
                <p className="text-white/90 text-lg">Integrations Needed</p>
              </div>
            </div>
            <div className="mt-12 p-6 bg-white/10 backdrop-blur-lg rounded-2xl">
              <p className="text-center text-xl font-medium">
                "AURA isn't just restaurant software - it's a complete operations system that makes running a restaurant feel effortless."
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="mt-16 text-center">
          <Link to={createPageUrl("Dashboard")}>
            <Button size="lg" className="bg-gradient-to-r from-[#014D40] to-emerald-600 hover:shadow-2xl transition-all text-lg px-12 py-6">
              <Sparkles className="w-6 h-6 mr-3" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}