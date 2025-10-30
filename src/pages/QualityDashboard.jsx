import React, { useEffect } from 'react';
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

const QualityMetrics = () => {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['qualityRecords'],
    queryFn: () => base44.entities.QualityRecord.list('-created_date', 50),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading quality metrics..." />;
  }

  if (!records || records.length === 0) {
    return (
      <EmptyState 
        icon={Star}
        title="No Quality Data Yet"
        message="Start recording quality checks to see metrics here"
      />
    );
  }

  const avgScore = records.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / records.length;
  const excellentCount = records.filter(r => parseFloat(r.score) >= 4.5).length;
  const needsAttention = records.filter(r => parseFloat(r.score) < 3).length;

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-3xl font-bold text-green-600">{avgScore.toFixed(1)}/5</p>
            </div>
            <Star className="w-10 h-10 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Excellent Checks</p>
              <p className="text-3xl font-bold text-blue-600">{excellentCount}</p>
            </div>
            <Zap className="w-10 h-10 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Attention</p>
              <p className="text-3xl font-bold text-orange-600">{needsAttention}</p>
            </div>
            <BarChart3 className="w-10 h-10 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function QualityDashboard() {
  useEffect(() => {
    document.title = 'Quality Dashboard - AURA';
  }, []);

  const tabs = [
    {
      id: 'quick-check',
      label: 'Quick Check',
      icon: Star,
      component: QuickQualityCheck,
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: FileText,
      component: QualityTemplates,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      component: QualityReports,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <QualityMetrics />
        <DashboardTabsLayout 
          tabs={tabs}
          defaultTab="quick-check"
          title="Quality Dashboard"
          icon={Star}
        />
      </div>
    </div>
  );
}