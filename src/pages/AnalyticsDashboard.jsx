
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  Target,
  CheckCircle,
  Star,
  Clock,
  Package,
  AlertTriangle,
  Download,
  Calendar,
  Home,
  Users,
  BarChart3,
  Activity,
  Lightbulb,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { motion } from 'framer-motion';

import { safeNumber, safePercent, safeAverage } from '@/utils/safeNumber';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7days');
  const [department, setDepartment] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Fetch analytics data
  const { data: snapshots = [] } = useQuery({
    queryKey: ['analyticsSnapshots', department],
    queryFn: async () => {
      return await base44.entities.AnalyticsSnapshot.filter({
        department: department === 'all' ? { $exists: true } : department
      }, '-snapshot_date', 30);
    },
    enabled: isManager,
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['analyticsInsights'],
    queryFn: () => base44.entities.AnalyticsInsight.list('-insight_date', 10),
    enabled: isManager,
  });

  // Get latest snapshot
  const latestSnapshot = snapshots[0] || {
    task_completion_rate: 0,
    quality_score_avg: 0,
    shift_compliance: 0,
    inventory_cost_variance: 0,
    active_alerts: 0,
  };

  // Prepare stats using latest snapshot data and safe number utilities
  // Note: The outline provided specific calculations for 'tasks', 'qualityRecords', 'attendance', 'events'.
  // As these data sources are not defined in the current file, we're mapping to the existing 'latestSnapshot'
  // properties and applying 'safeNumber' for consistent formatting.
  const stats = {
    taskCompletionRate: latestSnapshot.task_completion_rate, // Assuming this is already a percentage
    qualityAvg: latestSnapshot.quality_score_avg, // Assuming this is already an average score
    attendanceRate: latestSnapshot.shift_compliance, // Using shift_compliance as a proxy for attendance rate
    activeAlerts: latestSnapshot.active_alerts,
  };


  // Prepare chart data
  const trendData = snapshots.slice(0, 7).reverse().map(s => ({
    date: format(new Date(s.snapshot_date), 'MMM d'),
    quality: s.quality_score_avg || 0,
    tasks: s.task_completion_rate || 0,
    compliance: s.shift_compliance || 0,
  }));

  const departmentData = [
    { name: 'Kitchen', value: 92, color: '#10B981' },
    { name: 'FOH', value: 88, color: '#3B82F6' },
    { name: 'Bar', value: 95, color: '#8B5CF6' },
    { name: 'Cleaning', value: 87, color: '#F59E0B' },
  ];

  const qualityDistribution = [
    { name: 'Excellent (5★)', value: 45, color: '#10B981' },
    { name: 'Good (4★)', value: 35, color: '#3B82F6' },
    { name: 'Average (3★)', value: 15, color: '#F59E0B' },
    { name: 'Below (1-2★)', value: 5, color: '#EF4444' },
  ];

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">Analytics Dashboard is only accessible to Managers and Administrators.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600">Performance insights & operational intelligence</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="front_of_house">Front of House</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="90days">90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Task Completion</h3>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {safeNumber(stats.taskCompletionRate, 1).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: 90%+</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Quality Score</h3>
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {safeNumber(stats.qualityAvg, 1).toFixed(1)}/5
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: 4.0+</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Attendance</h3>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {safeNumber(stats.attendanceRate, 1).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">On-time rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Active Alerts</h3>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-900">
                {stats.activeAlerts}
              </p>
              <p className="text-xs text-gray-500 mt-1">Needs attention</p>
            </CardContent>
          </Card>
        </div>


        {/* AI Insights */}
        {insights.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="p-4 bg-white rounded-lg border-2 border-purple-200">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        insight.severity === 'positive' ? 'bg-green-100' :
                        insight.severity === 'warning' ? 'bg-amber-100' :
                        'bg-blue-100'
                      }`}>
                        {insight.severity === 'positive' ? <TrendingUp className="w-5 h-5 text-green-600" /> :
                         insight.severity === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
                         <Activity className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                        {insight.recommended_actions && insight.recommended_actions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Recommended:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {insight.recommended_actions.map((action, i) => (
                                <li key={i}>• {action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {insight.change_percentage && (
                        <Badge className={insight.change_percentage > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {insight.change_percentage > 0 ? '+' : ''}{insight.change_percentage.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="quality" stroke="#F59E0B" strokeWidth={2} name="Quality Score" />
                  <Line type="monotone" dataKey="tasks" stroke="#10B981" strokeWidth={2} name="Task %" />
                  <Line type="monotone" dataKey="compliance" stroke="#3B82F6" strokeWidth={2} name="Compliance %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quality Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={qualityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {qualityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Department Performance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Department Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link to={createPageUrl('Reports')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-1">Full Reports</h3>
                <p className="text-sm text-gray-600">Detailed analytics & charts</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('PerformanceDashboard')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-1">Staff Performance</h3>
                <p className="text-sm text-gray-600">Team metrics & coaching</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('QualityReports')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Star className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-1">Quality Reports</h3>
                <p className="text-sm text-gray-600">Audit scores & trends</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
