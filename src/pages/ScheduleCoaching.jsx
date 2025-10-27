import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ArrowLeft, Home, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function ScheduleCoaching() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("PerformanceGrowth")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-indigo-600" />
            Schedule Coaching Session
          </h1>
          <p className="text-lg text-gray-600">
            Book your next coaching session with your manager
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">📅 Coaching Session Scheduling</h3>
                <p className="text-gray-700 mb-4">
                  Your manager will schedule coaching sessions for you. You'll receive a notification when a new session is scheduled.
                </p>
                <p className="text-sm text-gray-600">
                  If you need to change a scheduled session time, please speak with your manager directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Link to={createPageUrl('MyCoaching')}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <Calendar className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">View My Sessions</h3>
                <p className="text-sm text-gray-600">See all your upcoming and past coaching sessions</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('CoachingDashboard')}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <Calendar className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Manager Dashboard</h3>
                <p className="text-sm text-gray-600">For managers: View and schedule team coaching sessions</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}