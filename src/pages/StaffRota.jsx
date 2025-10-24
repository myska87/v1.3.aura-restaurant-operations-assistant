import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, UserCog, CalendarCheck, Clock, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const rotaModules = [
  {
    title: "My Shifts",
    description: "View your upcoming and past shifts with status tracking",
    icon: Calendar,
    url: createPageUrl("MyShifts"),
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Change Role",
    description: "Switch your assigned role for specific shifts",
    icon: UserCog,
    url: createPageUrl("ChangeRole"),
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Availability",
    description: "Manage your available days and preferred shift times",
    icon: CalendarCheck,
    url: createPageUrl("ManageAvailability"),
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Clock In / Out",
    description: "Active shift timer with automatic logging",
    icon: Clock,
    url: createPageUrl("ClockInOut"),
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    title: "Reports & Attendance",
    description: "View shift history, hours worked, and attendance records",
    icon: BarChart3,
    url: createPageUrl("AttendanceReports"),
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
];

export default function StaffRota() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Shift & Rota Management
          </h1>
          <p className="text-lg text-gray-600">
            Clock-In & Clock-Out System
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
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardContent className="p-6">
                      <div className={`p-4 ${module.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300 w-fit mb-4`}>
                        <Icon className={`w-8 h-8 ${module.iconColor}`} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-800">
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

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Automated Shift Management</h3>
                <p className="text-gray-700 leading-relaxed">
                  Complete shift scheduling system with real-time clock-in/out tracking, automatic checklist assignment, 
                  GPS verification, and comprehensive attendance reporting. Stay on top of your team's performance with 
                  automated notifications and seamless integration with hygiene compliance tasks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}