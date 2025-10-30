import React from 'react';
import { Star, Zap, BarChart3, FileText } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import QuickQualityCheck from './QuickQualityCheck';
import QualityTemplates from './QualityTemplates';
import QualityReports from './QualityReports';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

function QualityOverview() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['qualityRecords'],
    queryFn: () => base44.entities.QualityRecord.list('-created_date', 50),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading quality data..." />;
  }

  const avgScore = records.length > 0
    ? (records.reduce((sum, r) => sum + (r.score || 0), 0) / records.length).toFixed(1)
    : 0;

  const needsAttention = records.filter(r => (r.score || 0) < 3).length;
  const excellent = records.filter(r => r.score === 5).length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Average Quality</p>
            <p className="text-4xl font-bold text-emerald-600">{avgScore}/5</p>
            <p className="text-xs text-gray-500 mt-2">Last 50 checks</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Needs Attention</p>
            <p className="text-4xl font-bold text-red-600">{needsAttention}</p>
            <p className="text-xs text-gray-500 mt-2">Score &lt; 3</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-2">Excellent</p>
            <p className="text-4xl font-bold text-amber-600">{excellent}</p>
            <p className="text-xs text-gray-500 mt-2">Perfect 5/5 scores</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link to={createPageUrl('QuickQualityCheck')}>
              <Card className="bg-emerald-50 border-emerald-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <Zap className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Quick Quality Check</p>
                    <p className="text-xs text-gray-600">Perform instant audit</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('QualityTemplates')}>
              <Card className="bg-blue-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Manage Templates</p>
                    <p className="text-xs text-gray-600">Create audit forms</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Quality Checks */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Quality Checks</h3>
          {records.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No quality checks yet"
              description="Start performing quality checks to track performance"
              action={
                <Link to={createPageUrl('QuickQualityCheck')}>
                  <Button>Perform First Check</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {records.slice(0, 5).map((record) => (
                <Card key={record.id} className="bg-gray-50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{record.check_title}</p>
                      <p className="text-sm text-gray-600">{record.area} • {record.category}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {record.checked_by_name} • {new Date(record.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        (record.score || 0) >= 4 ? 'bg-green-100 text-green-800' :
                        (record.score || 0) === 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {record.score || 0}/5
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function QualityDashboard() {
  const tabs = [
    {
      value: 'overview',
      label: 'Overview',
      icon: Star,
      component: <QualityOverview />,
    },
    {
      value: 'quick-check',
      label: 'Quick Check',
      icon: Zap,
      component: <QuickQualityCheck />,
    },
    {
      value: 'templates',
      label: 'Templates',
      icon: FileText,
      component: <QualityTemplates />,
    },
    {
      value: 'reports',
      label: 'Reports',
      icon: BarChart3,
      component: <QualityReports />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Quality Hub"
      description="Quality audits, templates, and performance tracking"
      icon={Star}
      tabs={tabs}
      defaultTab="overview"
      helpText="Monitor and improve quality standards across all operations."
      searchPlaceholder="Search quality checks..."
    />
  );
}