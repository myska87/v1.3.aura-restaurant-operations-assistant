import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Home, TrendingUp, Target, Calendar, User, Star, Sparkles, MessageCircle, CheckCircle, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function MyCoaching() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Only fetch sessions for this user
  const { data: mySessions = [], isLoading } = useQuery({
    queryKey: ['myCoachingSessions', user?.email],
    queryFn: () => base44.entities.CoachingSession.filter(
      { staff_email: user?.email, status: 'completed' },
      '-session_date'
    ),
    enabled: !!user?.email,
  });

  const filteredSessions = mySessions.filter(session =>
    session.period?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.manager_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAverageScore = () => {
    if (mySessions.length === 0) return 0;
    const total = mySessions.reduce((sum, s) => sum + (s.overall_score || 0), 0);
    return (total / mySessions.length).toFixed(1);
  };

  const totalGoals = mySessions.reduce((sum, s) => sum + (s.goals_set?.length || 0), 0);
  const completedGoals = mySessions.reduce((sum, s) => 
    sum + (s.goals_set?.filter(g => g.status === 'achieved').length || 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('StaffDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Staff Hub
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-600" />
            My Coaching Journey
          </h1>
          <p className="text-gray-600 text-lg">
            Track your growth, goals, and development feedback
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <Star className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-sm opacity-90">Average Score</p>
              <p className="text-4xl font-bold">{calculateAverageScore()}/10</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <MessageCircle className="w-8 h-8 mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-4xl font-bold text-gray-900">{mySessions.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <Target className="w-8 h-8 mb-2 text-green-600" />
              <p className="text-sm text-gray-600">Goals Set</p>
              <p className="text-4xl font-bold text-gray-900">{totalGoals}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <Award className="w-8 h-8 mb-2 text-amber-600" />
              <p className="text-sm text-gray-600">Goals Achieved</p>
              <p className="text-4xl font-bold text-gray-900">{completedGoals}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-4">
            <Input
              placeholder="Search by period or manager..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Sessions List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-pulse">
                <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading your coaching sessions...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No coaching sessions yet</p>
              <p className="text-gray-400 text-sm">
                Your manager will schedule coaching sessions to support your growth
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="shadow-lg hover:shadow-xl transition-shadow border-2 border-purple-100">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-2">{session.period}</CardTitle>
                      <div className="flex gap-2">
                        <Badge className="bg-purple-100 text-purple-800">
                          <User className="w-3 h-3 mr-1" />
                          Coach: {session.manager_name}
                        </Badge>
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(session.session_date), 'MMM d, yyyy')}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Overall Score</div>
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-3xl font-bold text-gray-900">{session.overall_score}/10</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  
                  {/* Self-Reflection */}
                  {session.self_reflection && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        My Self-Reflection
                      </h3>
                      <div className="space-y-3 bg-blue-50 rounded-lg p-4">
                        {session.self_reflection.what_went_well && (
                          <div>
                            <p className="text-sm font-semibold text-blue-900">🌟 What went well:</p>
                            <p className="text-gray-700">{session.self_reflection.what_went_well}</p>
                          </div>
                        )}
                        {session.self_reflection.challenges_faced && (
                          <div>
                            <p className="text-sm font-semibold text-blue-900">🤔 Challenges:</p>
                            <p className="text-gray-700">{session.self_reflection.challenges_faced}</p>
                          </div>
                        )}
                        {session.self_reflection.areas_for_improvement && (
                          <div>
                            <p className="text-sm font-semibold text-blue-900">📈 Areas for improvement:</p>
                            <p className="text-gray-700">{session.self_reflection.areas_for_improvement}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manager Feedback */}
                  {session.manager_feedback && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Manager Feedback
                      </h3>
                      <div className="space-y-3 bg-green-50 rounded-lg p-4">
                        {session.manager_feedback.strengths_observed && (
                          <div>
                            <p className="text-sm font-semibold text-green-900">✨ Your Strengths:</p>
                            <p className="text-gray-700">{session.manager_feedback.strengths_observed}</p>
                          </div>
                        )}
                        {session.manager_feedback.areas_to_develop && (
                          <div>
                            <p className="text-sm font-semibold text-green-900">📚 Development Areas:</p>
                            <p className="text-gray-700">{session.manager_feedback.areas_to_develop}</p>
                          </div>
                        )}
                        {session.manager_feedback.action_items && session.manager_feedback.action_items.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-green-900 mb-2">📋 Action Items:</p>
                            <ul className="space-y-1">
                              {session.manager_feedback.action_items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-700">
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Goals Set */}
                  {session.goals_set && session.goals_set.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5 text-amber-600" />
                        My Goals
                      </h3>
                      <div className="space-y-3">
                        {session.goals_set.map((goal, idx) => (
                          <Card key={idx} className="border-2 border-amber-200 bg-amber-50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-semibold text-gray-900 flex-1">{goal.goal}</p>
                                <Badge className={
                                  goal.status === 'achieved' ? 'bg-green-600' :
                                  goal.status === 'in_progress' ? 'bg-blue-600' :
                                  'bg-gray-600'
                                }>
                                  {goal.status || 'not started'}
                                </Badge>
                              </div>
                              {goal.deadline && (
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                                </p>
                              )}
                              {goal.measurement && (
                                <p className="text-sm text-gray-600 mt-1">
                                  📊 Success measure: {goal.measurement}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Session Notes */}
                  {session.session_notes && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Additional Notes:</p>
                      <p className="text-gray-600 text-sm">{session.session_notes}</p>
                    </div>
                  )}

                  {/* Follow-up */}
                  {session.follow_up_date && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        Follow-up scheduled: {format(new Date(session.follow_up_date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}