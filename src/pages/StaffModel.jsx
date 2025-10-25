
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  MessageCircle, 
  Award,
  Heart,
  Calendar,
  BarChart3,
  Home,
  ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";

const staffModules = [
  {
    title: "Culture Building",
    description: "Company values, mission, and the Raving Fans philosophy",
    icon: Heart,
    url: createPageUrl("CultureBuilding"),
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    title: "Onboarding & Training",
    description: "Structured training paths, quizzes, digital certificates, and progress tracking",
    icon: GraduationCap,
    url: createPageUrl("OnboardingTraining"),
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Performance & Growth",
    description: "Monthly reviews, goal tracking, and performance badges",
    icon: TrendingUp,
    url: createPageUrl("PerformanceGrowth"),
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Communication & Feedback",
    description: "Team chat, suggestion box, and announcements",
    icon: MessageCircle,
    url: createPageUrl("CommunicationFeedback"),
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Recognition & Rewards",
    description: "Staff of the Month, peer recognition, and points system",
    icon: Award,
    url: createPageUrl("RecognitionRewards"),
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  {
    title: "Manager Dashboard",
    description: "Unified view of pending tasks, training, and performance",
    icon: BarChart3,
    url: createPageUrl("StaffManagerDashboard"),
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
];

export default function StaffModel() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
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
              <Users className="w-12 h-12 text-blue-600" />
              <h1 className="text-5xl font-bold text-gray-900">
                STAFF MODEL
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Build a strong team culture, automate training, track performance, and celebrate success — all in one place
            </p>
          </motion.div>
        </div>

        {/* Philosophy Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none shadow-2xl mb-12">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-3">🌟 Raving Fans Philosophy 🌟</h2>
              <p className="text-xl text-blue-50">
                "We don't want customers, we want <span className="font-bold underline">raving fans</span>."
              </p>
              <p className="text-blue-100 mt-3">
                This applies to our team too — we want raving fan employees who love what they do!
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Module Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffModules.map((module, index) => {
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
        <Card className="mt-12 bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Integrated Staff Management</h3>
                <p className="text-gray-700 leading-relaxed">
                  The Staff Model automatically connects with Scheduling, Checklists, and Performance data from other AURA modules.
                  When staff clock in, complete training, or receive recognition, everything feeds into their unified profile.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
