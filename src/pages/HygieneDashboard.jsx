
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Thermometer,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Award,
  Target,
  Droplet,
  Sparkles,
  Home,
  FileText,
  Users,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function HygieneDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const today = new Date().toISOString().split('T')[0];

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['hygieneRecords', today],
    queryFn: () => base44.entities.HygieneRecord.list('-created_date', 100),
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
      const allAlerts = await base44.entities.HygieneAlertLog.list('-created_date', 50);
      return allAlerts.filter(a => a.status === 'open' || a.status === 'acknowledged');
    },
  });

  const { data: formAssignments = [] } = useQuery({
    queryKey: ['formAssignments', user?.email, today],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date(todayDate);
      sevenDaysFromNow.setDate(todayDate.getDate() + 7);

      let assignments;
      if (isManager) {
        assignments = await base44.entities.FormAssignmentMetadata.list('-assigned_at', 100);
      } else {
        assignments = await base44.entities.FormAssignmentMetadata.filter({
          assigned_to_email: user.email
        }, '-assigned_at', 100);
      }
      
      return assignments.filter(a => {
        const dueDate = new Date(a.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return (
          (dueDate >= todayDate && dueDate <= sevenDaysFromNow) &&
          (a.completion_status !== 'completed' && a.completion_status !== 'archived')
        );
      });
    },
    enabled: !!user?.email,
  });

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
      case 'delivery_check':
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
      navigate(createPageUrl('FormIntelligence') + `?openForm=${formId}`);
    } else {
      navigate(createPageUrl('FormIntelligence'));
    }
  };

  const todayRecords = (records || []).filter(r => {
    const recordDate = new Date(r.created_date);
    const now = new Date();
    return recordDate.toDateString() === now.toDateString();
  });

  const myTodayRecords = todayRecords.filter(r => r.recorded_by_email === user?.email);

  const recordsInRange = (records || []).filter(r => r.is_in_range !== false).length;
  const complianceRate = records.length > 0
    ? Math.round((recordsInRange / records.length) * 100)
    : 100;

  const criticalAlerts = (alerts || []).filter(a => a.severity === 'critical' || a.severity === 'urgent').length;
  const openAlerts = (alerts || []).filter(a => a.status === 'open').length;

  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);

  const todayAssignments = (formAssignments || []).filter(a => {
    const dueDate = new Date(a.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === todayDateOnly.getTime();
  });

  const completedForms = (formAssignments || []).filter(a => a.completion_status === 'completed').length;
  const pendingForms = (formAssignments || []).filter(a => a.completion_status === 'pending' || a.completion_status === 'in_progress').length;
  const overdueForms = (formAssignments || []).filter(a => {
    const dueDate = new Date(a.due_date);
    return a.completion_status !== 'completed' && a.completion_status !== 'archived' && dueDate < new Date();
  }).length;
  
  const formCompletionRate = formAssignments.length > 0
    ? Math.round((completedForms / formAssignments.length) * 100)
    : 100;

  const expectedDailyTasks = 10;
  const todayTaskCompletion = Math.min(100, Math.round((myTodayRecords.length / expectedDailyTasks) * 100));

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

  const auditReadiness = () => {
    let score = 100;
    score -= openAlerts * 5;
    score -= overdueForms * 10;
    if (complianceRate < 95) score -= (95 - complianceRate);
    if (formCompletionRate < 95) score -= (95 - formCompletionRate);
    if (myTodayRecords.length < expectedDailyTasks) {
      score -= (expectedDailyTasks - myTodayRecords.length) * 3;
    }
    return Math.max(0, Math.min(100, score));
  };

  const auditScore = auditReadiness();

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

  if (loadingUser || loadingRecords) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner message="Loading hygiene dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center gap-3">
            <Droplet className="w-10 h-10 text-blue-600" />
            Hygiene Central
          </h1>
          <p className="text-gray-600 text-lg">
            Temperature tracking, cleaning schedules, and compliance monitoring
          </p>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts > 0 && (
          <Card className="mb-6 border-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">
                    {criticalAlerts} Critical {criticalAlerts === 1 ? 'Alert' : 'Alerts'} Requiring Immediate Attention
                  </p>
                  <p className="text-sm text-red-700">
                    Review temperature variances or hygiene issues now
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Thermometer className="w-8 h-8 text-emerald-600" />
                <Badge className="bg-emerald-100 text-emerald-800">
                  {complianceRate}%
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Compliance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{recordsInRange}/{records.length}</p>
              <Progress value={complianceRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <Badge className="bg-blue-100 text-blue-800">
                  {formCompletionRate}%
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Forms Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedForms}/{formAssignments.length}</p>
              <Progress value={formCompletionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Award className="w-8 h-8 text-purple-600" />
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < starRating ? 'text-yellow-400' : 'text-gray-300'}>
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">Hygiene Rating</p>
              <p className="text-2xl font-bold text-gray-900">{starRating}/5 Stars</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-8 h-8 text-amber-600" />
                <Badge className={
                  auditScore >= 90 ? 'bg-green-100 text-green-800' :
                  auditScore >= 75 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {auditScore}%
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Audit Readiness</p>
              <p className="text-2xl font-bold text-gray-900">{auditScore}/100</p>
              <Progress value={auditScore} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Today's Tasks */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Today's Hygiene Tasks ({todayAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAssignments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                ✅ No forms due today - great work!
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {todayAssignments.map((assignment) => (
                  <Card key={assignment.id} className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(createPageUrl('FormIntelligence') + `?openForm=${assignment.form_template_id}&assignmentId=${assignment.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{assignment.form_name}</p>
                        <Badge className="bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Today
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{assignment.form_category}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Quick Hygiene Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => handleQuickAction('storage_fridge')}
                className="h-20 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Thermometer className="w-6 h-6" />
                <span className="text-sm">Fridge Temp</span>
              </Button>
              <Button
                onClick={() => handleQuickAction('storage_freezer')}
                className="h-20 flex flex-col gap-2 bg-cyan-600 hover:bg-cyan-700"
              >
                <Thermometer className="w-6 h-6" />
                <span className="text-sm">Freezer Temp</span>
              </Button>
              <Button
                onClick={() => handleQuickAction('cleaning')}
                className="h-20 flex flex-col gap-2 bg-green-600 hover:bg-green-700"
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-sm">Cleaning Log</span>
              </Button>
              <Button
                onClick={() => handleQuickAction('delivery_check')}
                className="h-20 flex flex-col gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm">Delivery Check</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              My Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((achievement, idx) => (
                <Card key={idx} className={achievement.unlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{achievement.title}</p>
                        <p className="text-xs text-gray-600">{achievement.description}</p>
                      </div>
                      {achievement.unlocked && (
                        <CheckCircle className="w-6 h-6 text-yellow-600" />
                      )}
                    </div>
                    <Progress value={achievement.progress} className="mt-2" />
                    <p className="text-xs text-gray-500 mt-1 text-right">{achievement.progress}%</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
