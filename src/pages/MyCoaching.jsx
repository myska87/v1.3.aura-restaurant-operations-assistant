import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Award, Target, MessageCircle, CheckCircle, Clock, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function MyCoaching() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: mySessions = [], isLoading } = useQuery({
    queryKey: ['myCoachingSessions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.CoachingSession.filter({
        staff_email: user.email
      }, '-session_date', 20);
    },
    enabled: !!user?.email,
  });

  const { data: myBadges = [] } = useQuery({
    queryKey: ['myCoachingBadges', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.CoachingBadge.filter({
        staff_email: user.email
      }, '-date_awarded', 50);
    },
    enabled: !!user?.email,
  });

  const completedSessions = mySessions.filter(s => s.status === 'completed');
  const pendingSessions = mySessions.filter(s => s.status === 'self_reflection_pending' || s.status === 'scheduled');
  const nextSession = pendingSessions[0];

  const statusColors = {
    'scheduled': 'bg-blue-100 text-blue-800',
    'self_reflection_pending': 'bg-amber-100 text-amber-800',
    'manager_review_pending': 'bg-purple-100 text-purple-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
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
            <TrendingUp className="w-10 h-10 text-green-600" />
            My Coaching Journey
          </h1>
          <p className="text-lg text-gray-600">
            Track your growth, goals, and achievements
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                  <p className="text-3xl font-bold text-gray-900">{mySessions.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedSessions.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Badges Earned</p>
                  <p className="text-3xl font-bold text-yellow-600">{myBadges.length}</p>
                </div>
                <Award className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-amber-600">{pendingSessions.length}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Session Alert */}
        {nextSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-8">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-1">📅 Next Coaching Session</h3>
                    <p className="text-sm text-green-700 mb-3">
                      {format(new Date(nextSession.session_date), 'EEEE, MMMM d, yyyy')} with {nextSession.manager_name}
                    </p>
                    {nextSession.status === 'self_reflection_pending' && (
                      <Link to={createPageUrl('SelfReflection') + `?session=${nextSession.id}`}>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Complete Self-Reflection
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sessions History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Coaching Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading sessions...</div>
                ) : mySessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No coaching sessions yet</p>
                    <p className="text-sm text-gray-400">Your manager will schedule your first session soon</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mySessions.map((session) => (
                      <Card key={session.id} className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900">{session.period}</h4>
                                <Badge className={statusColors[session.status] || 'bg-gray-100 text-gray-800'}>
                                  {session.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                📅 {format(new Date(session.session_date), 'MMM d, yyyy')} • 
                                👔 {session.manager_name}
                              </p>
                              {session.overall_score && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-sm text-gray-600">Score:</span>
                                  <span className="font-bold text-green-600">{session.overall_score}/10</span>
                                </div>
                              )}
                            </div>
                            {session.status === 'self_reflection_pending' && (
                              <Link to={createPageUrl('SelfReflection') + `?session=${session.id}`}>
                                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                                  Complete
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Badges & Achievements */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  My Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myBadges.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No badges earned yet</p>
                    <p className="text-xs text-gray-400 mt-1">Keep up the great work!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myBadges.map((badge) => (
                      <div key={badge.id} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-200">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{badge.badge_icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{badge.badge_name}</h4>
                            <p className="text-xs text-gray-600">{badge.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(badge.date_awarded), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={createPageUrl('GrowthTracker')}>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Growth Tracker
                  </Button>
                </Link>
                <Link to={createPageUrl('CoachingAchievements')}>
                  <Button variant="outline" className="w-full justify-start">
                    <Award className="w-4 h-4 mr-2" />
                    All Achievements
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}