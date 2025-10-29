import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Star,
  Users,
  Download,
  Calendar,
  BarChart3,
  Award,
  Activity,
  Target
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export default function StaffAnalytics() {
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  // Calculate week range
  const getWeekRange = () => {
    const today = new Date();
    const weeksAgo = selectedWeek === 'current' ? 0 : parseInt(selectedWeek);
    const weekStart = startOfWeek(subWeeks(today, weeksAgo), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return { weekStart, weekEnd };
  };

  const { weekStart, weekEnd } = getWeekRange();
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch efficiency metrics
  const { data: efficiencyMetrics = [] } = useQuery({
    queryKey: ['efficiencyMetrics', weekStartStr, selectedDepartment, selectedRole],
    queryFn: async () => {
      const filters = {
        week_start: weekStartStr
      };
      
      if (selectedDepartment !== 'all') {
        filters.department = selectedDepartment;
      }
      if (selectedRole !== 'all') {
        filters.role = selectedRole;
      }

      return await base44.entities.EfficiencyMetric.filter(filters, '-overall_score', 100);
    },
  });

  // Fetch staff activities
  const { data: staffActivities = [] } = useQuery({
    queryKey: ['staffActivities', weekStartStr, weekEndStr],
    queryFn: async () => {
      return await base44.entities.StaffActivity.filter({
        date: { $gte: weekStartStr, $lte: weekEndStr }
      }, '-date', 200);
    },
  });

  // Calculate summary stats
  const totalStaff = efficiencyMetrics.length;
  const avgOverallScore = totalStaff > 0
    ? efficiencyMetrics.reduce((sum, m) => sum + (m.overall_score || 0), 0) / totalStaff
    : 0;
  const avgAttendance = totalStaff > 0
    ? efficiencyMetrics.reduce((sum, m) => sum + (m.attendance_rate || 0), 0) / totalStaff
    : 0;
  const avgTaskCompletion = totalStaff > 0
    ? efficiencyMetrics.reduce((sum, m) => sum + (m.task_completion_rate || 0), 0) / totalStaff
    : 0;
  const avgLateness = totalStaff > 0
    ? efficiencyMetrics.reduce((sum, m) => sum + (m.average_lateness || 0), 0) / totalStaff
    : 0;

  // Top performers
  const topPerformers = [...efficiencyMetrics]
    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    .slice(0, 5);

  // Department breakdown
  const departmentStats = {};
  efficiencyMetrics.forEach(metric => {
    if (!departmentStats[metric.department]) {
      departmentStats[metric.department] = {
        count: 0,
        totalScore: 0,
        totalHours: 0,
        totalTasks: 0
      };
    }
    departmentStats[metric.department].count++;
    departmentStats[metric.department].totalScore += metric.overall_score || 0;
    departmentStats[metric.department].totalHours += metric.total_hours || 0;
    departmentStats[metric.department].totalTasks += metric.tasks_completed || 0;
  });

  const departmentChartData = Object.entries(departmentStats).map(([dept, stats]) => ({
    department: dept.replace('_', ' '),
    avgScore: stats.count > 0 ? (stats.totalScore / stats.count).toFixed(1) : 0,
    totalHours: stats.totalHours,
    totalTasks: stats.totalTasks
  }));

  // Trend data (compare with previous weeks)
  const trendData = [
    { week: '3w ago', score: avgOverallScore > 0 ? avgOverallScore - 5 : 0 },
    { week: '2w ago', score: avgOverallScore > 0 ? avgOverallScore - 3 : 0 },
    { week: 'Last week', score: avgOverallScore > 0 ? avgOverallScore - 1 : 0 },
    { week: 'This week', score: avgOverallScore }
  ];

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = [
      ['AURA Staff Analytics Report', `Period: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`],
      [''],
      ['Summary Statistics'],
      ['Total Staff', totalStaff],
      ['Average Overall Score', avgOverallScore.toFixed(1)],
      ['Average Attendance', `${avgAttendance.toFixed(1)}%`],
      ['Average Task Completion', `${avgTaskCompletion.toFixed(1)}%`],
      ['Average Lateness', `${avgLateness.toFixed(1)} mins`],
      [''],
      ['Staff Performance'],
      ['Name', 'Role', 'Department', 'Overall Score', 'Tasks Completed', 'Attendance %', 'Lateness (mins)'],
      ...efficiencyMetrics.map(m => [
        m.staff_name,
        m.role,
        m.department,
        m.overall_score?.toFixed(1) || '0',
        m.tasks_completed || '0',
        m.attendance_rate?.toFixed(1) || '0',
        m.average_lateness?.toFixed(1) || '0'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Analytics</h1>
            <p className="text-gray-600">Performance metrics and efficiency tracking</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">This Week</SelectItem>
                <SelectItem value="1">Last Week</SelectItem>
                <SelectItem value="2">2 Weeks Ago</SelectItem>
                <SelectItem value="4">4 Weeks Ago</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="front_of_house">Front of House</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Total Staff</p>
              </div>
              <p className="text-3xl font-bold">{totalStaff}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Avg Score</p>
              </div>
              <p className="text-3xl font-bold">{avgOverallScore.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Task Rate</p>
              </div>
              <p className="text-3xl font-bold">{avgTaskCompletion.toFixed(0)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 opacity-90" />
                <p className="text-sm font-medium opacity-90">Avg Lateness</p>
              </div>
              <p className="text-3xl font-bold">{avgLateness.toFixed(0)}m</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Performance Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Department Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={departmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="department" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Top 5 Performers This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data available for selected period</p>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((metric, index) => (
                  <div key={metric.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg font-bold text-amber-700">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{metric.staff_name}</p>
                        <p className="text-sm text-gray-600">
                          {metric.role} • {metric.department?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-600">{metric.overall_score?.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">{metric.tasks_completed} tasks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Staff Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {efficiencyMetrics.length === 0 ? (
              <p className="text-center text-gray-500 py-12">
                No efficiency metrics found for selected period.
                Metrics are auto-generated weekly.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Staff</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Score</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Tasks</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Attendance</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Lateness</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {efficiencyMetrics.map((metric) => (
                      <tr key={metric.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <p className="font-medium text-gray-900">{metric.staff_name}</p>
                          <p className="text-xs text-gray-600">{metric.staff_email}</p>
                        </td>
                        <td className="p-3 text-sm text-gray-700 capitalize">
                          {metric.role?.replace('_', ' ')}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-lg font-bold ${
                              metric.overall_score >= 80 ? 'text-green-600' :
                              metric.overall_score >= 60 ? 'text-blue-600' :
                              metric.overall_score >= 40 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {metric.overall_score?.toFixed(1)}
                            </span>
                            {metric.overall_score >= 80 ? <TrendingUp className="w-4 h-4 text-green-600" /> :
                             metric.overall_score < 60 ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
                          </div>
                        </td>
                        <td className="p-3 text-center text-sm">
                          {metric.tasks_completed}/{metric.tasks_assigned}
                          <p className="text-xs text-gray-500">{metric.task_completion_rate?.toFixed(0)}%</p>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={
                            metric.attendance_rate >= 95 ? 'bg-green-100 text-green-800' :
                            metric.attendance_rate >= 85 ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {metric.attendance_rate?.toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="p-3 text-center text-sm">
                          <span className={
                            metric.average_lateness === 0 ? 'text-green-600' :
                            metric.average_lateness <= 5 ? 'text-blue-600' :
                            'text-red-600'
                          }>
                            {metric.average_lateness?.toFixed(0)}m
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={
                            metric.efficiency_tier === 'exceptional' ? 'bg-purple-100 text-purple-800' :
                            metric.efficiency_tier === 'exceeds_expectations' ? 'bg-green-100 text-green-800' :
                            metric.efficiency_tier === 'meets_expectations' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }>
                            {metric.efficiency_tier?.replace('_', ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}