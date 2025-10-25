import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Users, BarChart3, ListChecks, ArrowRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const rotaModules = [
  {
    title: "My Shifts",
    description: "View your upcoming and past shifts with status and timing",
    icon: Calendar,
    url: createPageUrl("MyShifts"),
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Clock In / Out",
    description: "Record your shift hours with location and time tracking",
    icon: Clock,
    url: createPageUrl("ClockInOut"),
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Manage Availability",
    description: "Set your available days and preferred shift times",
    icon: ListChecks,
    url: createPageUrl("ManageAvailability"),
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Weekly Rota Schedule",
    description: "View the complete weekly schedule with all staff assignments",
    icon: Users,
    url: createPageUrl("WeeklyRotaSchedule"),
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    title: "Attendance Reports",
    description: "Track hours worked, lateness, and compliance summaries",
    icon: BarChart3,
    url: createPageUrl("Reports"),
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
];

export default function StaffRota() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Home className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Shift & Rota Management
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive staff scheduling, clock-in/out, and attendance tracking
          </p>
        </div>

        {/* Module Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rotaModules.map((module, index) => {
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
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className={`p-4 ${module.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-8 h-8 ${module.iconColor}`} />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </CardHeader>

                    <CardContent>
                      <CardTitle className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {module.title}
                      </CardTitle>
                      <p className="text-gray-600 leading-relaxed">
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