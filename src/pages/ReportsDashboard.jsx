
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Users,
  FileText,
  ClipboardCheck,
  Package,
  Calendar,
  Download,
  Sparkles,
  Lock,
  Home,
  Filter,
  BarChart3,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AccessGuard from '../components/AccessGuard';

const COLORS = ['#014D40', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ReportsDashboard() {
  const [dateRange, setDateRange] = useState('7days');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAuthorized = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list('-shift_date', 200),
    enabled: isAuthorized,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date', 200),
    enabled: isAuthorized,
  });

  const { data: sopSignatures = [] } = useQuery({
    queryKey: ['sopSignatures'],
    queryFn: () => base44.entities.SOPSignatureLog.list('-signed_at', 200),
    enabled: isAuthorized,
  });

  const { data: hygieneRecords = [] } = useQuery({
    queryKey: ['hygieneRecords'],
    queryFn: () => base44.entities.HygieneRecord.list('-created_date', 200),
    enabled: isAuthorized,
  });

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['qualityRecords'],
    queryFn: () => base44.entities.QualityRecord.list('-created_date', 200),
    enabled: isAuthorized,
  });

  const { data: formResponses = [] } = useQuery({
    queryKey: ['formResponses'],
    queryFn: () => base44.entities.FormResponse.list('-submitted_at', 200),
    enabled: isAuthorized,
  });

  const { data: coachingSessions = [] } = useQuery({
    queryKey: ['coachingSessions'],
    queryFn: () => base44.entities.CoachingSession.list('-session_date', 100),
    enabled: isAuthorized,
  });

  const getDaysToShow = () => {
    switch (dateRange) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 7;
    }
  };

  const dateRangeData = useMemo(() => {
    const days = getDaysToShow();
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      return {
        date: format(date, 'MMM d'),
        fullDate: format(date, 'yyyy-MM-dd'),
      };
    });
  }, [dateRange]);

  const attendanceTrend = useMemo(() => {
    return dateRangeData.map(({ date, fullDate }) => {
      const dayRecords = attendanceRecords.filter(r => 
        r.shift_date?.startsWith(fullDate)
      );
      const onTime = dayRecords.filter(r => r.status === 'on_time').length;
      const late = dayRecords.filter(r => r.status === 'late').length;
      const total = dayRecords.length;
      const complianceRate = total > 0 ? Math.round((onTime / total) * 100) : 0;

      return {
        date,
        onTime,
        late,
        complianceRate,
      };
    });
  }, [attendanceRecords, dateRangeData]);

  const hygieneScoreTrend = useMemo(() => {
    return dateRangeData.map(({ date, fullDate }) => {
      const dayRecords = hygieneRecords.filter(r => 
        r.created_date?.startsWith(fullDate)
      );
      const avgScore = dayRecords.length > 0
        ? Math.round((dayRecords.filter(r => r.is_in_range).length / dayRecords.length) * 100)
        : 0;

      return {
        date,
        score: avgScore,
      };
    });
  }, [hygieneRecords, dateRangeData]);

  const qualityScoreTrend = useMemo(() => {
    return dateRangeData.map(({ date, fullDate }) => {
      const dayRecords = qualityRecords.filter(r => 
        r.created_date?.startsWith(fullDate)
      );
      const avgScore = dayRecords.length > 0
        ? (dayRecords.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / dayRecords.length).toFixed(1)
        : 0;

      return {
        date,
        score: parseFloat(avgScore),
      };
    });
  }, [qualityRecords, dateRangeData]);

  const sopCompletionByRole = useMemo(() => {
    const roleStats = {};
    sopSignatures.forEach(sig => {
      const role = sig.role || 'Unknown';
      if (!roleStats[role]) {
        roleStats[role] = 0;
      }
      roleStats[role]++;
    });
    return Object.entries(roleStats).map(([role, count]) => ({
      role: role.replace(/_/g, ' '),
      count,
    }));
  }, [sopSignatures]);

  const formCompletionStats = useMemo(() => {
    const total = formResponses.length;
    const completed = formResponses.filter(f => f.status === 'submitted' || f.status === 'approved').length;
    const pending = formResponses.filter(f => f.status === 'draft').length;
    const rejected = formResponses.filter(f => f.status === 'rejected').length;

    return [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pending },
      { name: 'Rejected', value: rejected },
    ].filter(item => item.value > 0);
  }, [formResponses]);

  const handleGenerateAISummary = async () => {
    setAiGenerating(true);
    try {
      const onTimeCount = attendanceRecords.filter(r => r.status === 'on_time').length;
      const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
      const hygieneCompliance = hygieneRecords.length > 0 
        ? Math.round((hygieneRecords.filter(r => r.is_in_range).length / hygieneRecords.length) * 100)
        : 0;
      const avgQuality = qualityRecords.length > 0
        ? (qualityRecords.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / qualityRecords.length).toFixed(1)
        : 0;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a restaurant operations analyst. Analyze this week's data and provide a concise executive summary.

Data:
- Total attendance records: ${attendanceRecords.length}
- On-time clock-ins: ${onTimeCount}
- Late clock-ins: ${lateCount}
- Total SOP signatures: ${sopSignatures.length}
- Total hygiene records: ${hygieneRecords.length}
- Hygiene compliance rate: ${hygieneCompliance}%
- Total quality checks: ${qualityRecords.length}
- Average quality score: ${avgQuality}/5
- Forms completed: ${formResponses.filter(f => f.status === 'submitted').length}
- Coaching sessions: ${coachingSessions.length}

Provide:
1. Overall Performance Summary (2-3 sentences)
2. Key Wins (2-3 bullet points)
3. Areas for Improvement (2-3 bullet points)
4. Recommended Actions (2-3 specific actions)`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            wins: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            actions: { type: "array", items: { type: "string" } }
          }
        }
      });
      setAiSummary(response);
    } catch (error) {
      console.error('AI summary failed:', error);
      alert('Failed to generate AI summary');
    }
    setAiGenerating(false);
  };

  const exportToCSV = () => {
    const csvData = [
      ['AURA Restaurant - Comprehensive Report'],
      [`Generated: ${format(new Date(), 'PPP p')}`],
      [''],
      ['ATTENDANCE SUMMARY'],
      ['Total Records', attendanceRecords.length],
      ['On Time', attendanceRecords.filter(r => r.status === 'on_time').length],
      ['Late', attendanceRecords.filter(r => r.status === 'late').length],
      ['Compliance Rate', `${attendanceRecords.length > 0 ? Math.round((attendanceRecords.filter(r => r.status === 'on_time').length / attendanceRecords.length) * 100) : 0}%`],
      [''],
      ['SOP COMPLIANCE'],
      ['Total Signatures', sopSignatures.length],
      ['Unique Staff', new Set(sopSignatures.map(s => s.staff_email)).size],
      [''],
      ['HYGIENE METRICS'],
      ['Total Records', hygieneRecords.length],
      ['In Range', hygieneRecords.filter(r => r.is_in_range).length],
      ['Compliance Rate', `${hygieneRecords.length > 0 ? Math.round((hygieneRecords.filter(r => r.is_in_range).length / hygieneRecords.length) * 100) : 0}%`],
      [''],
      ['QUALITY METRICS'],
      ['Total Checks', qualityRecords.length],
      ['Avg Score', `${qualityRecords.length > 0 ? (qualityRecords.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / qualityRecords.length).toFixed(1) : 0}/5`],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const isLoading = !attendanceRecords || !shifts;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <LoadingSpinner message="Loading analytics data..." />
      </div>
    );
  }

  const totalStaff = new Set(attendanceRecords.map(r => r.staff_email)).size;
  const avgAttendanceRate = attendanceRecords.length > 0
    ? Math.round((attendanceRecords.filter(r => r.status === 'on_time').length / attendanceRecords.length) * 100)
    : 0;
  const avgHygieneScore = hygieneRecords.length > 0
    ? Math.round((hygieneRecords.filter(r => r.is_in_range).length / hygieneRecords.length) * 100)
    : 0;
  const avgQualityScore = qualityRecords.length > 0
    ? (qualityRecords.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / qualityRecords.length).toFixed(1)
    : 0;

  return (
    <AccessGuard allowedRoles={['admin']} allowedPositions={['manager', 'owner']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-blue-600" />
              Reports Center
            </h1>
            <p className="text-gray-600 text-lg">Enterprise analytics and insights</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateAISummary}
              disabled={aiGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {aiGenerating ? 'Generating...' : 'AI Summary'}
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {aiSummary && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">📊 Summary</h3>
                <p className="text-gray-700 leading-relaxed">{aiSummary.summary}</p>
              </div>
              <div>
                <h3 className="font-bold text-green-900 mb-2">✅ Key Wins</h3>
                <ul className="space-y-1">
                  {aiSummary.wins?.map((win, idx) => (
                    <li key={idx} className="text-green-800 flex items-start gap-2">
                      <span>•</span>
                      <span>{win}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-amber-900 mb-2">⚠️ Areas for Improvement</h3>
                <ul className="space-y-1">
                  {aiSummary.improvements?.map((imp, idx) => (
                    <li key={idx} className="text-amber-800 flex items-start gap-2">
                      <span>•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-blue-900 mb-2">🎯 Recommended Actions</h3>
                <ul className="space-y-1">
                  {aiSummary.actions?.map((action, idx) => (
                    <li key={idx} className="text-blue-800 flex items-start gap-2">
                      <span>•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 border rounded-lg bg-white"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Staff</p>
                  <p className="text-3xl font-bold text-blue-600">{totalStaff}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                  <p className="text-3xl font-bold text-green-600">{avgAttendanceRate}%</p>
                </div>
                <Calendar className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">SOPs Signed</p>
                  <p className="text-3xl font-bold text-purple-600">{sopSignatures.length}</p>
                </div>
                <FileText className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Hygiene Score</p>
                  <p className="text-3xl font-bold text-amber-600">{avgHygieneScore}%</p>
                </div>
                <ClipboardCheck className="w-10 h-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Compliance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="complianceRate" stroke="#10B981" strokeWidth={2} name="Compliance %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hygiene Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hygieneScoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line type="monotone" dataKey="score" stroke="#F59E0B" strokeWidth={2} name="Hygiene %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>SOP Completion by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sopCompletionByRole}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="role" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Completion Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={formCompletionStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {formCompletionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quality Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={qualityScoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }} 
                />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} name="Avg Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AccessGuard>
  );
}
