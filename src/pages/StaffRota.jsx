import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function StaffRota() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.position === 'manager' || user?.position === 'owner';
  const hasManagementAccess = isAdmin || isManager;

  const rotaModules = [
    {
      title: "My Shifts",
      description: "View your upcoming shifts and clock in/out",
      icon: Calendar,
      url: createPageUrl("MyShifts"),
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      accessLevel: "all", // Everyone can access
    },
    {
      title: "Clock In/Out",
      description: "Track your working hours and attendance",
      icon: Clock,
      url: createPageUrl("ClockInOut"),
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      accessLevel: "all",
    },
    {
      title: "My Availability",
      description: "Set your weekly availability and time-off requests",
      icon: Users,
      url: createPageUrl("ManageAvailability"),
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      accessLevel: "all",
    },
    {
      title: "Weekly Rota Schedule",
      description: "Create and manage weekly staff schedules",
      icon: Calendar,
      url: createPageUrl("WeeklyRotaSchedule"),
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      accessLevel: "management", // Admin/Manager only
    },
    {
      title: "Attendance Reports",
      description: "View attendance statistics and patterns",
      icon: TrendingUp,
      url: createPageUrl("Reports"),
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      accessLevel: "management",
    },
  ];

  // Filter modules based on access level
  const accessibleModules = rotaModules.filter(module => 
    module.accessLevel === "all" || (module.accessLevel === "management" && hasManagementAccess)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Shift & Rota Management
          </h1>
          <p className="text-lg text-gray-600">
            {hasManagementAccess 
              ? "Manage schedules, track attendance, and optimize staffing"
              : "View your shifts, clock in/out, and manage your availability"
            }
          </p>
        </div>

        {/* Access Level Indicator */}
        {!hasManagementAccess && (
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  <strong>Staff Member View:</strong> You can view your own shifts and availability. 
                  Contact your manager for schedule changes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link to={module.url}>
                  <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardContent className="p-6">
                      <div className={`p-4 ${module.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300 mb-4 inline-block`}>
                        <Icon className={`w-8 h-8 ${module.iconColor}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {module.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}