import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Droplets,
  Package,
  Award,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Home,
  Plus,
  Eye,
  Calendar,
  Zap,
  Trophy,
  Target,
  Activity,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function HygieneDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['hygieneRecords', selectedPeriod],
    queryFn: async () => {
      const allRecords = await base44.entities.HygieneRecord.list('-created_date');
      
      const now = new Date();
      let filterDate;
      
      if (selectedPeriod === 'today') {
        filterDate = new Date();
        filterDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'week') {
        filterDate = startOfWeek(now);
      } else if (selectedPeriod === '30days') {
        filterDate = subDays(now, 30);
      }
      
      return allRecords.filter(r => new Date(r.created_date) >= filterDate);
    },
  });

  const { data: myScore } = useQuery({
    queryKey: ['myHygieneScore', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const scores = await base44.entities.HygieneUserScore.filter({
        staff_email: user.email
      });
      return scores[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['hygieneAlerts'],
    queryFn: async () => {
      const allAlerts = await base44.entities.HygieneAlertLog.list('-created_date');
      return allAlerts.filter(a => a.status === 'open' || a.status === 'acknowledged');
    },
  });

  const { data: teamScoreboard } = useQuery({
    queryKey: ['teamScoreboard'],
    queryFn: async () => {
      const scoreboards = await base44.entities.HygieneTeamScoreboard.list('-last_calculated');
      return scoreboards[0] || null;
    },
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Calculate stats
  const todayRecords = records.filter(r => {
    const recordDate = new Date(r.created_date);
    const today = new Date();
    return recordDate.toDateString() === today.toDateString();
  });

  const temperatureRecords = records.filter(r => 
    ['delivery', 'storage_fridge', 'storage_freezer', 'cooking', 'cooling'].includes(r.record_type)
  );

  const cleaningRecords = records.filter(r => r.record_type === 'cleaning');
  const deliveryRecords = records.filter(r => r.record_type === 'delivery');

  const recordsInRange = records.filter(r => r.is_in_range !== false).length;
  const complianceRate = records.length > 0 
    ? Math.round((recordsInRange / records.length) * 100) 
    : 100;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent').length;
  const openAlerts = alerts.filter(a => a.status === 'open').length;

  // Star rating calculation
  const calculateStarRating = () => {
    if (complianceRate >= 98) return 5;
    if (complianceRate >= 95) return 4;
    if (complianceRate >= 90) return 3;
    if (complianceRate >= 80) return 2;
    if (complianceRate >= 70) return 1;
    return 0;
  };

  const starRating = calculateStarRating();

  // Audit readiness
  const auditReadiness = () => {
    let score = 100;
    
    // Deduct for open alerts
    score -= openAlerts * 5;
    
    // Deduct for low compliance
    if (complianceRate < 95) score -= (95 - complianceRate);
    
    // Deduct for missing records (expected vs actual)
    const expectedRecords = 10; // Expected per day
    const actualRecords = todayRecords.length;
    if (actualRecords < expectedRecords) {
      score -= (expectedRecords - actualRecords) * 3;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const auditScore = auditReadiness();

  const quickActions = [
    {
      title: "Temperature Log",
      description: "Record fridge, freezer & cooking temps",
      icon: Thermometer,
      color: "from-blue-500 to-cyan-500",
      path: "/hygiene/temperature-log",
      count: temperatureRecords.length,
    },
    {
      title: "Cleaning Records",
      description: "Log cleaning tasks & attach photos",
      icon: Droplets,
      color: "from-green-500 to-emerald-500",
      path: "/hygiene/cleaning",
      count: cleaningRecords.length,
    },
    {
      title: "Delivery Checks",
      description: "Verify temperature & condition",
      icon: Package,
      color: "from-purple-500 to-indigo-500",
      path: "/hygiene/delivery-checks",
      count: deliveryRecords.length,
    },
    {
      title: "My Records",
      description: "View all your hygiene logs",
      icon: Eye,
      color: "from-amber-500 to-orange-500",
      path: "/hygiene/my-records",
      count: records.filter(r => r.recorded_by_email === user?.email).length,
    },
  ];

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)), url("https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=1920")',
      }}
    >
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex gap-3 mb-6">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#014D40] to-emerald-600 flex items-center justify-center shadow-lg">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                Hygiene Central
              </h1>
              <p className="text-gray-600">Smart hygiene tracking with real-time EHO compliance</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm font-medium"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Top Stats Row */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Today's Records</p>
                    <p className="text-3xl font-bold text-gray-900">{todayRecords.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">On track</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Compliance Rate</p>
                    <p className="text-3xl font-bold text-gray-900">{complianceRate}%</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${complianceRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Leafe Star Rating</p>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`w-6 h-6 ${
                            i <= starRating 
                              ? 'fill-[#E0B037] text-[#E0B037]' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  {starRating === 5 && "Outstanding hygiene standards"}
                  {starRating === 4 && "Excellent hygiene practices"}
                  {starRating === 3 && "Good hygiene compliance"}
                  {starRating < 3 && "Improvement needed"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Audit Readiness</p>
                    <p className="text-3xl font-bold text-gray-900">{auditScore}%</p>
                  </div>
                  <div className={`p-3 rounded-xl ${
                    auditScore >= 95 ? 'bg-green-100' :
                    auditScore >= 80 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {auditScore >= 95 ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className={`w-6 h-6 ${
                        auditScore >= 80 ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    )}
                  </div>
                </div>
                <Badge className={
                  auditScore >= 95 ? 'bg-green-100 text-green-800' :
                  auditScore >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }>
                  {auditScore >= 95 ? '✅ EHO Ready' : auditScore >= 80 ? '⚠️ Nearly Ready' : '❌ Action Required'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts */}
          {alerts.length > 0 && (
            <Card className="mb-8 border-none shadow-lg bg-gradient-to-r from-red-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="w-5 h-5" />
                  Active Alerts ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          alert.severity === 'critical' || alert.severity === 'urgent' 
                            ? 'bg-red-500' 
                            : 'bg-yellow-500'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900">{alert.item_name}</p>
                          <p className="text-sm text-gray-600">
                            {alert.location} • {alert.alert_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Resolve
                      </Button>
                    </div>
                  ))}
                </div>
                {alerts.length > 3 && (
                  <Button variant="link" className="mt-2 w-full">
                    View all {alerts.length} alerts
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={createPageUrl(action.path)}>
                    <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer group bg-white/90 backdrop-blur">
                      <CardContent className="p-6">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{action.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {action.count} recorded
                          </Badge>
                          <Plus className="w-5 h-5 text-gray-400 group-hover:text-[#014D40] transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Gamification Section */}
          {myScore && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-600" />
                    Your Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-4xl font-bold text-purple-900">{myScore.points_this_week || 0}</p>
                      <p className="text-sm text-gray-600">Points this week</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{myScore.total_points || 0}</p>
                      <p className="text-xs text-gray-600">Total points</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Streak</span>
                      <Badge className="bg-orange-100 text-orange-800">
                        🔥 {myScore.current_streak || 0} days
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Compliance Rate</span>
                      <span className="font-bold text-green-600">{myScore.compliance_rate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Venue Rank</span>
                      <Badge variant="outline">
                        #{myScore.rank_in_venue || '-'}
                      </Badge>
                    </div>
                  </div>

                  {myScore.badges_earned && myScore.badges_earned.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Recent Badges</p>
                      <div className="flex gap-2 flex-wrap">
                        {myScore.badges_earned.slice(0, 5).map((badge, i) => (
                          <div
                            key={i}
                            className="text-2xl"
                            title={badge.badge_name}
                          >
                            {badge.badge_icon}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-600" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        title: "Clean Sweep",
                        description: "Complete all daily records",
                        icon: "🧹",
                        progress: Math.min(100, (todayRecords.length / 10) * 100),
                        unlocked: todayRecords.length >= 10
                      },
                      {
                        title: "Quick Chill",
                        description: "All temps within safe limits",
                        icon: "❄️",
                        progress: complianceRate,
                        unlocked: complianceRate >= 98
                      },
                      {
                        title: "Zero Alerts",
                        description: "7 days without variance",
                        icon: "✅",
                        progress: Math.min(100, ((myScore?.current_streak || 0) / 7) * 100),
                        unlocked: (myScore?.current_streak || 0) >= 7
                      },
                    ].map((achievement, i) => (
                      <div key={i} className="p-4 bg-white rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{achievement.icon}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{achievement.title}</p>
                            <p className="text-xs text-gray-600">{achievement.description}</p>
                          </div>
                          {achievement.unlocked && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Unlocked
                            </Badge>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full transition-all"
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Records */}
          <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#014D40]" />
                  Recent Records
                </span>
                <Link to={createPageUrl("/hygiene/my-records")}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No records yet today</p>
                  <Button onClick={() => navigate(createPageUrl("/hygiene/temperature-log"))}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Record
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {records.slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          record.is_in_range === false 
                            ? 'bg-red-100' 
                            : 'bg-green-100'
                        }`}>
                          {record.is_in_range === false ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{record.item_name}</p>
                          <p className="text-sm text-gray-600">
                            {record.record_type.replace('_', ' ')} • 
                            {record.recorded_value !== null && ` ${record.recorded_value}°C`} • 
                            {format(new Date(record.created_date), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{record.recorded_by_name}</p>
                        {record.points_awarded > 0 && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            +{record.points_awarded} pts
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}