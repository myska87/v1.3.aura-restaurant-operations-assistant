import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MessageCircle, Target, Calendar, Award, BarChart3, Home, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const performanceModules = [
  {
    title: "Coaching Dashboard",
    description: "View and manage all coaching sessions, track team progress",
    icon: BarChart3,
    url: createPageUrl("CoachingDashboard"),
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    access: "manager",
  },
  {
    title: "My Coaching",
    description: "View your coaching sessions, goals, and growth journey",
    icon: TrendingUp,
    url: createPageUrl("MyCoaching"),
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
    access: "all",
  },
  {
    title: "Self-Reflection",
    description: "Complete your monthly self-reflection before coaching sessions",
    icon: MessageCircle,
    url: createPageUrl("SelfReflection"),
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
    access: "all",
  },
  {
    title: "Growth Tracker",
    description: "Visualize your development journey and progress over time",
    icon: Target,
    url: createPageUrl("GrowthTracker"),
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    access: "all",
  },
  {
    title: "Achievements & Badges",
    description: "View earned badges and coaching milestones",
    icon: Award,
    url: createPageUrl("CoachingAchievements"),
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
    access: "all",
  },
  {
    title: "Schedule Review",
    description: "Book and manage upcoming coaching sessions",
    icon: Calendar,
    url: createPageUrl("ScheduleCoaching"),
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
    access: "all",
  },
];

export default function PerformanceGrowth() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffModel")}>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Staff Model
            </button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <TrendingUp className="w-12 h-12 text-green-600" />
              <h1 className="text-5xl font-bold text-gray-900">
                Performance & Growth
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Coaching builds champions, not critics. Track your growth, set goals, and celebrate progress.
            </p>
          </motion.div>
        </div>

        {/* Philosophy Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-none shadow-2xl mb-12">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-3">🌱 Growth Mindset 🌱</h2>
              <p className="text-xl text-green-50">
                "Small daily improvements create massive success. Every coaching session is a step forward."
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Module Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performanceModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link to={module.url}>
                  <Card className="bg-white border-none shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden relative h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

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
        <Card className="mt-12 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Continuous Growth System</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our coaching system replaces traditional performance reviews with meaningful conversations.
                  Complete regular coaching sessions to earn badges, track progress, and unlock your full potential.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}