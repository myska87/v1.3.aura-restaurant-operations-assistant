import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft,
  Home,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  MessageSquare,
  Tag,
  BarChart,
  Search,
  Download,
  Filter,
  Loader2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subDays, subWeeks } from 'date-fns';
import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function MeetingInsights() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('30'); // days

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['allMeetings'],
    queryFn: () => base44.entities.MeetingRecording.list('-meeting_date', 500),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['allMeetingActions'],
    queryFn: () => base44.entities.MeetingAction.list('-created_date', 1000),
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ['allMeetingAttendees'],
    queryFn: () => base44.entities.MeetingAttendee.list('-created_date', 1000),
  });

  // Filter data by date range
  const filteredMeetings = useMemo(() => {
    const cutoffDate = subDays(new Date(), parseInt(dateRange));
    return meetings.filter(m => new Date(m.meeting_date) >= cutoffDate);
  }, [meetings, dateRange]);

  // Calculate insights
  const insights = useMemo(() => {
    const total = filteredMeetings.length;
    const totalDuration = filteredMeetings.reduce((sum, m) => sum + (m.audio_duration_seconds || 0), 0);
    const avgDuration = total > 0 ? Math.round(totalDuration / total / 60) : 0;

    // Meetings by type
    const byType = {};
    filteredMeetings.forEach(m => {
      byType[m.meeting_type] = (byType[m.meeting_type] || 0) + 1;
    });

    // Meetings by department
    const byDepartment = {};
    filteredMeetings.forEach(m => {
      byDepartment[m.department] = (byDepartment[m.department] || 0) + 1;
    });

    // Top topics
    const topicCounts = {};
    filteredMeetings.forEach(m => {
      if (m.topics_discussed) {
        m.topics_discussed.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });
    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Action statistics
    const totalActions = actions.length;
    const completedActions = actions.filter(a => a.status === 'completed').length;
    const overdueActions = actions.filter(a => {
      if (a.status === 'completed' || !a.due_date) return false;
      return new Date(a.due_date) < new Date();
    }).length;
    const actionCompletionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    // Most active staff
    const staffActivity = {};
    attendees.forEach(a => {
      if (a.attendance_status === 'present') {
        staffActivity[a.staff_name] = (staffActivity[a.staff_name] || 0) + 1;
      }
    });
    const mostActiveStaff = Object.entries(staffActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Sentiment breakdown
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      concerned: 0,
      urgent: 0
    };
    filteredMeetings.forEach(m => {
      if (m.sentiment) {
        sentimentCounts[m.sentiment]++;
      }
    });

    // Weekly trend
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = endOfWeek(weekStart);
      const weekMeetings = filteredMeetings.filter(m => {
        const meetingDate = new Date(m.meeting_date);
        return meetingDate >= weekStart && meetingDate <= weekEnd;
      });
      weeklyData.push({
        week: format(weekStart, 'MMM d'),
        meetings: weekMeetings.length,
        duration: Math.round(weekMeetings.reduce((sum, m) => sum + (m.audio_duration_seconds || 0), 0) / 60)
      });
    }

    return {
      total,
      totalDuration: Math.round(totalDuration / 60), // minutes
      avgDuration,
      byType,
      byDepartment,
      topTopics,
      totalActions,
      completedActions,
      overdueActions,
      actionCompletionRate,
      mostActiveStaff,
      sentimentCounts,
      weeklyData
    };
  }, [filteredMeetings, actions, attendees]);

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return filteredMeetings.filter(m => 
      m.title?.toLowerCase().includes(query) ||
      m.summary?.toLowerCase().includes(query) ||
      m.transcribed_text?.toLowerCase().includes(query) ||
      m.topics_discussed?.some(t => t.toLowerCase().includes(query))
    ).slice(0, 10);
  }, [filteredMeetings, searchQuery]);

  const COLORS = ['#014D40', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#014D40] mx-auto animate-spin mb-4" />
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Link to={createPageUrl("MeetingDashboard")}>
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

          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#014D40]"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>

            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Page Header */}
        <Card className="bg-gradient-to-r from-[#014D40] to-emerald-600 border-none text-white">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">📊 Meeting Insights</h1>
                <p className="text-emerald-100">
                  Analytics and trends from your team meetings
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-600" />
                <Badge variant="outline">{dateRange} days</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{insights.total}</p>
              <p className="text-sm text-gray-600">Total Meetings</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-purple-600" />
                <Badge variant="outline">Avg</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{insights.avgDuration}</p>
              <p className="text-sm text-gray-600">Minutes per meeting</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-100 text-green-800">{insights.actionCompletionRate}%</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{insights.completedActions}</p>
              <p className="text-sm text-gray-600">Actions completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-orange-600" />
                <Badge variant="outline">Total</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{attendees.length}</p>
              <p className="text-sm text-gray-600">Total attendance</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search meetings by title, content, or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600 font-medium">Found {searchResults.length} meeting(s):</p>
                {searchResults.map(meeting => (
                  <Link key={meeting.id} to={createPageUrl(`MeetingDetails?id=${meeting.id}`)}>
                    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <p className="font-medium text-gray-900">{meeting.title}</p>
                      <p className="text-xs text-gray-600">{format(new Date(meeting.meeting_date), 'PPP')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Weekly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Frequency Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={insights.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="meetings" stroke="#014D40" strokeWidth={2} name="Meetings" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Meetings by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Meetings by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(insights.byType).map(([type, count]) => ({
                      name: type.replace('_', ' '),
                      value: count
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(insights.byType).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#014D40]" />
                Most Discussed Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBar data={insights.topTopics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="topic" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" />
                </RechartsBar>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sentiment Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: insights.sentimentCounts.positive, color: '#10B981' },
                      { name: 'Neutral', value: insights.sentimentCounts.neutral, color: '#6B7280' },
                      { name: 'Concerned', value: insights.sentimentCounts.concerned, color: '#F59E0B' },
                      { name: 'Urgent', value: insights.sentimentCounts.urgent, color: '#EF4444' }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { color: '#10B981' },
                      { color: '#6B7280' },
                      { color: '#F59E0B' },
                      { color: '#EF4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Most Active Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#014D40]" />
              Most Active Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.mostActiveStaff.map((staff, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-600">{staff.count} meetings attended</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Items Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Action Items Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-4xl font-bold text-gray-900">{insights.completedActions}</p>
                <p className="text-gray-600 font-medium">Completed</p>
                <p className="text-xs text-gray-500 mt-2">{insights.actionCompletionRate}% completion rate</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-4xl font-bold text-gray-900">{insights.totalActions - insights.completedActions - insights.overdueActions}</p>
                <p className="text-gray-600 font-medium">In Progress</p>
                <p className="text-xs text-gray-500 mt-2">Currently being worked on</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                <p className="text-4xl font-bold text-gray-900">{insights.overdueActions}</p>
                <p className="text-gray-600 font-medium">Overdue</p>
                <p className="text-xs text-gray-500 mt-2">Require immediate attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}