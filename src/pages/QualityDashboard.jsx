import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  ArrowRight,
  Home,
  Plus,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";

export default function QualityDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("week");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  // Fetch quality records
  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['qualityRecords', selectedPeriod],
    queryFn: async () => {
      const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 1;
      const since = subDays(new Date(), days).toISOString();
      
      return await base44.entities.QualityRecord.filter({
        created_date: { $gte: since }
      }, '-created_date', 100);
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['qualityTemplates'],
    queryFn: () => base44.entities.QualityTemplate.list(),
  });

  // Calculate statistics
  const totalChecks = qualityRecords.length;
  const averageScore = totalChecks > 0
    ? (qualityRecords.reduce((sum, r) => sum + r.score, 0) / totalChecks).toFixed(1)
    : 0;

  const excellentCount = qualityRecords.filter(r => r.score === 5).length;
  const poorCount = qualityRecords.filter(r => r.score < 3).length;
  const needsActionCount = qualityRecords.filter(r => r.corrective_action_required && r.status !== 'closed').length;

  // Calculate by category
  const categoryScores = qualityRecords.reduce((acc, record) => {
    if (!acc[record.category]) {
      acc[record.category] = { total: 0, count: 0, records: [] };
    }
    acc[record.category].total += record.score;
    acc[record.category].count += 1;
    acc[record.category].records.push(record);
    return acc;
  }, {});

  const categoryStats = Object.entries(categoryScores).map(([category, data]) => ({
    category,
    average: (data.total / data.count).toFixed(1),
    count: data.count,
    records: data.records
  })).sort((a, b) => b.average - a.average);

  // Calculate by area
  const areaScores = qualityRecords.reduce((acc, record) => {
    if (!acc[record.area]) {
      acc[record.area] = { total: 0, count: 0 };
    }
    acc[record.area].total += record.score;
    acc[record.area].count += 1;
    return acc;
  }, {});

  const areaStats = Object.entries(areaScores).map(([area, data]) => ({
    area,
    average: (data.total / data.count).toFixed(1),
    count: data.count
  })).sort((a, b) => b.average - a.average);

  // Top performers
  const staffPerformance = qualityRecords.reduce((acc, record) => {
    const key = record.checked_by_email;
    if (!acc[key]) {
      acc[key] = {
        email: record.checked_by_email,
        name: record.checked_by_name,
        total: 0,
        count: 0
      };
    }
    acc[key].total += record.score;
    acc[key].count += 1;
    return acc;
  }, {});

  const topPerformers = Object.values(staffPerformance)
    .map(staff => ({
      ...staff,
      average: (staff.total / staff.count).toFixed(1)
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  // Recurring issues (AI detection placeholder)
  const recurringIssues = qualityRecords
    .filter(r => r.is_recurring_issue)
    .slice(0, 5);

  const getScoreColor = (score) => {
    if (score >= 4.5) return 'text-green-600 bg-green-50';
    if (score >= 4) return 'text-blue-600 bg-blue-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

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
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl">
              <Star className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Quality Control Center
              </h1>
              <p className="text-gray-600 mt-1">Continuous quality monitoring and improvement</p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedPeriod === 'today' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('today')}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('week')}
            >
              This Week
            </Button>
            <Button
              size="sm"
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('month')}
            >
              This Month
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        {isManager && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Link to={createPageUrl('QuickQualityCheck')}>
              <Button className="w-full h-20 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all">
                <div className="text-center">
                  <Plus className="w-6 h-6 mx-auto mb-1" />
                  <p className="font-bold">Quick Quality Check</p>
                </div>
              </Button>
            </Link>

            <Link to={createPageUrl('QualityTemplates')}>
              <Button variant="outline" className="w-full h-20">
                <div className="text-center">
                  <Target className="w-6 h-6 mx-auto mb-1" />
                  <p className="font-bold">Manage Templates</p>
                </div>
              </Button>
            </Link>

            <Link to={createPageUrl('QualityReports')}>
              <Button variant="outline" className="w-full h-20">
                <div className="text-center">
                  <BarChart3 className="w-6 h-6 mx-auto mb-1" />
                  <p className="font-bold">View Reports</p>
                </div>
              </Button>
            </Link>
          </div>
        )}

        {/* Main Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-white border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-emerald-600" />
                  <Badge variant="outline">Average</Badge>
                </div>
                <p className="text-4xl font-bold text-gray-900">{averageScore}</p>
                <p className="text-sm text-gray-600 mt-1">Quality Score</p>
                <p className="text-xs text-gray-500 mt-1">{totalChecks} checks performed</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <Badge variant="outline">Excellent</Badge>
                </div>
                <p className="text-4xl font-bold text-green-600">{excellentCount}</p>
                <p className="text-sm text-gray-600 mt-1">5-Star Checks</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalChecks > 0 ? Math.round((excellentCount / totalChecks) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <Badge variant="outline">Low</Badge>
                </div>
                <p className="text-4xl font-bold text-red-600">{poorCount}</p>
                <p className="text-sm text-gray-600 mt-1">Needs Improvement</p>
                <p className="text-xs text-gray-500 mt-1">Scores below 3</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <Badge variant="outline">Pending</Badge>
                </div>
                <p className="text-4xl font-bold text-orange-600">{needsActionCount}</p>
                <p className="text-sm text-gray-600 mt-1">Open Actions</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting correction</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Category Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Performance by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryStats.length > 0 ? (
              <div className="space-y-3">
                {categoryStats.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">
                          {cat.category.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge className={getScoreColor(cat.average)}>
                            {cat.average} ⭐
                          </Badge>
                          <span className="text-xs text-gray-500">{cat.count} checks</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(cat.average / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No quality checks recorded yet</p>
                <p className="text-sm mt-1">Start performing quality checks to see stats</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Area Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Performance by Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaStats.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {areaStats.map((area) => (
                  <div key={area.area} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold capitalize">{area.area.replace(/_/g, ' ')}</h4>
                      <Badge className={getScoreColor(area.average)}>
                        {area.average} ⭐
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{area.count} checks performed</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No area data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Quality Champions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map((staff, index) => (
                  <div key={staff.email} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-600">{staff.count} quality checks</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">
                      {staff.average} ⭐ Average
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No performance data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Quality Checks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Quality Checks</CardTitle>
              <Link to={createPageUrl('QualityReports')}>
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {qualityRecords.length > 0 ? (
              <div className="space-y-3">
                {qualityRecords.slice(0, 10).map((record) => (
                  <div key={record.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{record.check_title}</h4>
                          <Badge className={getScoreColor(record.score)}>
                            {record.score} ⭐
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 capitalize">
                          {record.category.replace(/_/g, ' ')} • {record.area.replace(/_/g, ' ')}
                        </p>
                        {record.comments && (
                          <p className="text-sm text-gray-700 mt-2">{record.comments}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{record.checked_by_name}</span>
                          <span>•</span>
                          <span>{format(new Date(record.created_date), 'PPp')}</span>
                        </div>
                      </div>
                      {record.photo_url && (
                        <img
                          src={record.photo_url}
                          alt="Quality check"
                          className="w-20 h-20 rounded-lg object-cover ml-4"
                        />
                      )}
                    </div>
                    {record.corrective_action_required && (
                      <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-800">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">Corrective action required</span>
                        </div>
                        {record.corrective_action_taken && (
                          <p className="text-sm text-gray-700 mt-1">
                            ✓ {record.corrective_action_taken}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No Quality Checks Yet</p>
                <p className="text-sm mb-4">Start recording quality checks to track performance</p>
                {isManager && (
                  <Link to={createPageUrl('QuickQualityCheck')}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Perform Quality Check
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}