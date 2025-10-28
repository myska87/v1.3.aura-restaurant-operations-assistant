
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Thermometer,
  Droplets,
  PackageCheck,
  Wrench,
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
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function HygieneDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const today = new Date().toISOString().split('T')[0]; // Format 'YYYY-MM-DD' for query keys

  // Fetch hygiene records
  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['hygieneRecords', today], // Query key now includes `today`
    queryFn: () => base44.entities.HygieneRecord.list('-created_date', 100), // Fetch all, will filter for `todayRecords` later
  });

  // Fetch user's hygiene score
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

  // Fetch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['hygieneAlerts'],
    queryFn: async () => {
      const allAlerts = await base44.entities.HygieneAlertLog.list('-created_date', 50);
      return allAlerts.filter(a => a.status === 'open' || a.status === 'acknowledged');
    },
  });

  // Fetch team scoreboard
  const { data: teamScoreboard } = useQuery({
    queryKey: ['teamScoreboard'],
    queryFn: async () => {
      const scoreboards = await base44.entities.HygieneTeamScoreboard.list('-last_calculated');
      return scoreboards[0] || null;
    },
  });

  // Fetch form assignments for today
  const { data: formAssignments = [] } = useQuery({
    queryKey: ['formAssignments', user?.email, today],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0); // Normalize to start of today
      const sevenDaysFromNow = new Date(todayDate);
      sevenDaysFromNow.setDate(todayDate.getDate() + 7);

      let assignments;
      if (isManager) {
        // Managers see all assignments
        assignments = await base44.entities.FormAssignmentMetadata.list('-assigned_at', 100);
      } else {
        // Staff see only their assignments
        assignments = await base44.entities.FormAssignmentMetadata.filter({
          assigned_to_email: user.email
        }, '-assigned_at', 100);
      }
      
      // Filter for assignments due within next 7 days or active and not completed/archived
      return assignments.filter(a => {
        const dueDate = new Date(a.due_date);
        dueDate.setHours(0, 0, 0, 0); // Normalize due date
        return (
          (dueDate >= todayDate && dueDate <= sevenDaysFromNow) && // Due within next 7 days
          (a.completion_status !== 'completed' && a.completion_status !== 'archived') // Or not completed/archived
        );
      });
    },
    enabled: !!user?.email,
  });

  // Fetch form responses (completed forms)
  const { data: responses = [] } = useQuery({
    queryKey: ['formResponses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      if (isManager) {
        return await base44.entities.FormResponse.list('-submitted_at', 100);
      } else {
        return await base44.entities.FormResponse.filter({
          staff_email: user.email
        }, '-submitted_at', 100);
      }
    },
    enabled: !!user?.email,
  });

  // Fetch hygiene-related form templates (not directly used for display, but good to have)
  const { data: hygieneForms = [] } = useQuery({
    queryKey: ['hygieneForms'],
    queryFn: async () => {
      const allForms = await base44.entities.FormTemplate.list();
      return allForms.filter(f => 
        f.category === 'haccp' || 
        f.category === 'sops' || 
        f.category === 'equipment' ||
        f.is_active // Also include any active forms not explicitly categorized
      );
    },
  });

  // Query for quick action forms
  const { data: quickActionForms = {} } = useQuery({
    queryKey: ['quickActionForms'],
    queryFn: async () => {
      const allForms = await base44.entities.FormTemplate.list();
      return {
        temperature: allForms.find(f => f.form_name === 'Daily Temperature Log'),
        cleaning: allForms.find(f => f.form_name === 'Cleaning & Sanitisation Record'),
        delivery: allForms.find(f => f.form_name === 'Delivery Temperature Check'),
        equipment: allForms.find(f => f.form_name === 'Equipment Safety Check')
      };
    },
  });

  // Calculate leaderboard
  const { data: userScores = [] } = useQuery({
    queryKey: ['hygieneUserScores'],
    queryFn: () => base44.entities.HygieneUserScore.list('-total_points'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleQuickAction = (actionType) => {
    let formId = null;
    
    switch(actionType) {
      case 'storage_fridge':
      case 'storage_freezer':
      case 'cooking':
      case 'cooling':
        formId = quickActionForms.temperature?.id;
        break;
      case 'cleaning':
        formId = quickActionForms.cleaning?.id;
        break;
      case 'delivery_check': // Using 'delivery_check' for the quick action card, as 'delivery' is ambiguous with the record type
        formId = quickActionForms.delivery?.id;
        break;
      case 'equipment_check':
        formId = quickActionForms.equipment?.id;
        break;
      default:
        console.warn("Unknown quick action type:", actionType);
        break;
    }

    if (formId) {
      // Navigate to Form Intelligence with the specific form
      navigate(createPageUrl('FormIntelligence') + `?openForm=${formId}`);
    } else {
      // Fallback: open Form Intelligence main page
      navigate(createPageUrl('FormIntelligence'));
    }
  };

  // Calculate stats from records
  const todayRecords = records.filter(r => {
    const recordDate = new Date(r.created_date);
    const now = new Date();
    return recordDate.toDateString() === now.toDateString();
  });

  // Filter records specific to the current user for gamification
  const myTodayRecords = todayRecords.filter(r => r.recorded_by_email === user?.email);

  const recordsInRange = records.filter(r => r.is_in_range !== false).length;
  const complianceRate = records.length > 0
    ? Math.round((recordsInRange / records.length) * 100)
    : 100;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent').length;
  const openAlerts = alerts.filter(a => a.status === 'open').length;

  // Form-based metrics
  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);

  const todayAssignments = formAssignments.filter(a => {
    const dueDate = new Date(a.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === todayDateOnly.getTime();
  });

  const completedForms = formAssignments.filter(a => a.completion_status === 'completed').length;
  const pendingForms = formAssignments.filter(a => a.completion_status === 'pending' || a.completion_status === 'in_progress').length;
  const overdueForms = formAssignments.filter(a => {
    const dueDate = new Date(a.due_date);
    return a.completion_status !== 'completed' && a.completion_status !== 'archived' && dueDate < new Date();
  }).length;
  
  const formCompletionRate = formAssignments.length > 0
    ? Math.round((completedForms / formAssignments.length) * 100)
    : 100;

  // Calculate today's expected tasks vs completed
  const expectedDailyTasks = 10; // Expected records per day
  const todayTaskCompletion = Math.min(100, Math.round((myTodayRecords.length / expectedDailyTasks) * 100));


  // Star rating calculation
  const calculateStarRating = () => {
    const avgRate = (complianceRate + formCompletionRate) / 2;
    if (avgRate >= 98) return 5;
    if (avgRate >= 95) return 4;
    if (avgRate >= 90) return 3;
    if (avgRate >= 80) return 2;
    if (avgRate >= 70) return 1;
    return 0;
  };

  const starRating = calculateStarRating();

  // Audit readiness based on forms + records
  const auditReadiness = () => {
    let score = 100;

    // Deduct for open alerts
    score -= openAlerts * 5;
    // Deduct for overdue forms
    score -= overdueForms * 10;
    
    // Deduct for low compliance (records)
    if (complianceRate < 95) score -= (95 - complianceRate);
    // Deduct for low completion (forms)
    if (formCompletionRate < 95) score -= (95 - formCompletionRate);
    
    // Deduct for missing records (expected vs actual) for current user
    if (myTodayRecords.length < expectedDailyTasks) {
      score -= (expectedDailyTasks - myTodayRecords.length) * 3;
    }

    return Math.max(0, Math.min(100, score));
  };

  const auditScore = auditReadiness();

  // Calculate dynamic achievements
  const achievements = [
    {
      title: "Clean Sweep",
      description: `Complete ${expectedDailyTasks} daily records`,
      icon: "🧹",
      progress: todayTaskCompletion,
      unlocked: myTodayRecords.length >= expectedDailyTasks
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
    {
      title: "Form Master",
      description: "Complete all assigned forms",
      icon: "📋",
      progress: formAssignments.length > 0 ? Math.round((completedForms / formAssignments.length) * 100) : 100,
      unlocked: pendingForms === 0 && formAssignments.length > 0
    },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6 md:p-8"
    >
      <div className="max-w-7xl mx-auto space-y-6"> {/* Added space-y-6 here */}
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
        </div>

        {/* Top Stats Row - Connected to Forms */}
        <div className="grid md:grid-cols-4 gap-4"> {/* Removed mb-8 */}
          <Card 
            className="border-none shadow-lg bg-white/80 backdrop-blur cursor-pointer hover:shadow-xl transition-all"
            onClick={() => navigate(createPageUrl('FormIntelligence'))}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Today's Records</p>
                  <p className="text-3xl font-bold text-gray-900">{myTodayRecords.length}</p>
                  <p className="text-xs text-gray-500 mt-1">{todayAssignments.length} forms due today</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 font-medium">{completedForms} forms completed</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-none shadow-lg bg-white/80 backdrop-blur cursor-pointer hover:shadow-xl transition-all"
            onClick={() => navigate(createPageUrl('FormIntelligence'))}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Compliance Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{Math.round((complianceRate + formCompletionRate) / 2)}%</p>
                  <p className="text-xs text-gray-500 mt-1">Records: {complianceRate}% | Forms: {formCompletionRate}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round((complianceRate + formCompletionRate) / 2)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">AURA Star Rating</p>
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

          <Card 
            className="border-none shadow-lg bg-white/80 backdrop-blur cursor-pointer hover:shadow-xl transition-all"
            onClick={() => navigate(createPageUrl('FormIntelligence'))}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Audit Readiness</p>
                  <p className="text-3xl font-bold text-gray-900">{auditScore}%</p>
                  <p className="text-xs text-gray-500 mt-1">{overdueForms} overdue forms</p>
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

        {/* Leaderboard Card */}
        {showLeaderboard && userScores.length > 0 && (
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  🏆 Hygiene Champions
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeaderboard(false)}
                >
                  Hide
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userScores.slice(0, 5).map((score, index) => {
                  const user = allUsers.find(u => u.email === score.staff_email);
                  const medals = ['🥇', '🥈', '🥉'];
                  
                  // SAFE NULL HANDLING
                  const complianceRateValue = score.compliance_rate !== null && score.compliance_rate !== undefined 
                    ? Number(score.compliance_rate) 
                    : 0;
                  
                  return (
                    <div
                      key={score.id}
                      className={`p-4 rounded-lg border-2 ${
                        index === 0 ? 'border-yellow-300 bg-yellow-50' :
                        index === 1 ? 'border-gray-300 bg-gray-50' :
                        index === 2 ? 'border-orange-300 bg-orange-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{medals[index] || `#${index + 1}`}</span>
                          <div>
                            <p className="font-bold text-gray-900">{score.staff_name}</p>
                            <p className="text-sm text-gray-600">{user?.position || 'Staff'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">
                            {score.total_points || 0}
                          </p>
                          <p className="text-xs text-gray-500">points</p>
                          {(score.current_streak || 0) > 0 && (
                            <Badge className="mt-1 bg-orange-500 text-white text-xs">
                              🔥 {score.current_streak} day streak
                            </Badge>
                          )}
                        </div>
                      </div>

                      {complianceRateValue > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Compliance Rate</span>
                            <span>{complianceRateValue.toFixed(0)}%</span>
                          </div>
                          <Progress value={complianceRateValue} className="h-2" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Card className="border-none shadow-lg bg-gradient-to-r from-red-50 to-orange-50"> {/* Removed mb-8 */}
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
                          {alert.location} • {alert.alert_type?.replace('_', ' ')}
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

        {/* Pending Forms Section */}
        {pendingForms > 0 && (
          <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50"> {/* Removed mb-8 */}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-blue-900">
                  <ClipboardList className="w-5 h-5" />
                  Pending Forms ({pendingForms})
                </span>
                <Button 
                  size="sm" 
                  onClick={() => navigate(createPageUrl('FormIntelligence'))}
                  className="bg-[#014D40] hover:bg-[#013830] text-white"
                >
                  View All Forms
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formAssignments
                  .filter(a => a.completion_status === 'pending' || a.completion_status === 'in_progress')
                  .slice(0, 6)
                  .map(assignment => (
                    <div key={assignment.id} className="p-4 bg-white rounded-lg border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{assignment.form_name}</h4>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {assignment.completion_status?.replace('_', ' ') || 'N/A'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Due: {format(new Date(assignment.due_date), 'MMM d, h:mm a')}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Assigned to: {assignment.assigned_to_name || 'N/A'}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate(createPageUrl('FormIntelligence', { formId: assignment.form_template_id, assignmentId: assignment.id }))}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Open Form
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Now Linked to Forms */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Removed mb-8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105"
              onClick={() => handleQuickAction('storage_fridge')}
            >
              <CardContent className="p-6">
                <Thermometer className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Temperature Log</h3>
                <p className="text-blue-100 text-sm mb-4">Fridge, freezer & cooking temps</p>
                <div className="flex items-center gap-2 mt-4 bg-white/20 rounded-lg p-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Open Daily Temp Form</span>
                </div>
                {quickActionForms.temperature && (
                  <Badge className="mt-3 bg-green-400 text-green-900 text-xs">
                    ✓ Form Ready
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className="bg-gradient-to-br from-purple-500 to-pink-500 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105"
              onClick={() => handleQuickAction('cleaning')}
            >
              <CardContent className="p-6">
                <Droplets className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Cleaning Record</h3>
                <p className="text-purple-100 text-sm mb-4">Log cleaning & sanitization</p>
                <div className="flex items-center gap-2 mt-4 bg-white/20 rounded-lg p-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Open Cleaning Form</span>
                </div>
                {quickActionForms.cleaning && (
                  <Badge className="mt-3 bg-green-400 text-green-900 text-xs">
                    ✓ Form Ready
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className="bg-gradient-to-br from-orange-500 to-red-500 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105"
              onClick={() => handleQuickAction('delivery_check')}
            >
              <CardContent className="p-6">
                <PackageCheck className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Delivery Check</h3>
                <p className="text-orange-100 text-sm mb-4">Verify goods on arrival</p>
                <div className="flex items-center gap-2 mt-4 bg-white/20 rounded-lg p-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Open Delivery Form</span>
                </div>
                {quickActionForms.delivery && (
                  <Badge className="mt-3 bg-green-400 text-green-900 text-xs">
                    ✓ Form Ready
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card
              className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105"
              onClick={() => handleQuickAction('equipment_check')}
            >
              <CardContent className="p-6">
                <Wrench className="w-12 h-12 mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Equipment Check</h3>
                <p className="text-emerald-100 text-sm mb-4">Monitor equipment status</p>
                <div className="flex items-center gap-2 mt-4 bg-white/20 rounded-lg p-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Open Equipment Form</span>
                </div>
                {quickActionForms.equipment && (
                  <Badge className="mt-3 bg-green-400 text-green-900 text-xs">
                    ✓ Form Ready
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Gamification Section - Now Live */}
        {myScore && (
          <div className="grid md:grid-cols-2 gap-6"> {/* Removed mb-8 */}
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
                    <span className="font-bold text-green-600">{complianceRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Forms Completed</span>
                    <span className="font-bold text-blue-600">{completedForms} / {formAssignments.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Records Today</span>
                    <span className="font-bold text-indigo-600">{myTodayRecords.length} / {expectedDailyTasks}</span>
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
                  {achievements.map((achievement, i) => (
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
                      <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(achievement.progress)}%</p>
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
                <Button onClick={() => handleQuickAction('storage_fridge')}>
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
                          {record.recorded_value !== null && !isNaN(record.recorded_value) && ` ${record.recorded_value}°C`}
                          {record.recorded_value !== null && isNaN(record.recorded_value) && ` ${record.recorded_value}`} •
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
  );
}
