import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowLeft, Home, Target, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function GrowthTracker() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['myCompletedSessions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allSessions = await base44.entities.CoachingSession.filter({
        staff_email: user.email,
        status: 'completed'
      }, 'session_date', 50);
      return allSessions;
    },
    enabled: !!user?.email,
  });

  // Prepare chart data
  const chartData = sessions.map((session) => ({
    date: format(new Date(session.session_date), 'MMM yyyy'),
    score: session.overall_score || 0,
    period: session.period,
  }));

  const averageScore = sessions.length > 0 
    ? (sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / sessions.length).toFixed(1)
    : 0;

  const latestScore = sessions.length > 0 ? sessions[sessions.length - 1].overall_score || 0 : 0;
  const previousScore = sessions.length > 1 ? sessions[sessions.length - 2].overall_score || 0 : 0;
  const improvement = latestScore - previousScore;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("MyCoaching")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Coaching
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
            <TrendingUp className="w-10 h-10 text-green-600" />
            Growth Tracker
          </h1>
          <p className="text-lg text-gray-600">
            Visualize your development journey over time
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Latest Score</p>
                  <p className="text-3xl font-bold text-gray-900">{latestScore}<span className="text-lg text-gray-500">/10</span></p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Score</p>
                  <p className="text-3xl font-bold text-gray-900">{averageScore}<span className="text-lg text-gray-500">/10</span></p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Improvement</p>
                  <p className={`text-3xl font-bold ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}
                  </p>
                </div>
                <Award className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No completed coaching sessions yet</p>
                <p className="text-sm text-gray-400 mt-2">Your growth chart will appear here after your first session</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                    name="Performance Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Session History */}
        {sessions.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 border-2 border-gray-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{session.period}</h4>
                        <p className="text-sm text-gray-600">
                          {format(new Date(session.session_date), 'MMMM d, yyyy')} • {session.manager_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{session.overall_score}/10</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}