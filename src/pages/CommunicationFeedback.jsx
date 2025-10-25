import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Megaphone, Lightbulb, Users, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const communicationModules = [
  {
    title: "Team Chat",
    description: "Real-time messaging, group channels, and direct messages",
    icon: MessageCircle,
    url: createPageUrl("TeamChat"),
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Announcements",
    description: "Company-wide announcements, celebrations, and important updates",
    icon: Megaphone,
    url: createPageUrl("Announcements"),
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Suggestion Box",
    description: "Submit ideas and feedback anonymously or publicly",
    icon: Lightbulb,
    url: createPageUrl("SuggestionBox"),
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    title: "Team Directory",
    description: "Find colleagues, view roles, and connect with team members",
    icon: Users,
    url: createPageUrl("TeamDirectory"),
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
];

export default function CommunicationFeedback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffModel")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Staff Model
            </Button>
          </Link>
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
              <MessageCircle className="w-12 h-12 text-purple-600" />
              <h1 className="text-5xl font-bold text-gray-900">
                Communication & Feedback
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay connected, share ideas, and build a stronger team together
            </p>
          </motion.div>
        </div>

        {/* Philosophy Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none shadow-2xl mb-12">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-3">💬 Open Communication 💬</h2>
              <p className="text-xl text-purple-50">
                "Great teams communicate openly. Every voice matters, every idea counts."
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Module Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {communicationModules.map((module, index) => {
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
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Connected Workplace</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our communication system keeps everyone in the loop with real-time chat, 
                  important announcements, and a space for your ideas. Build stronger connections 
                  and help us improve together.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}