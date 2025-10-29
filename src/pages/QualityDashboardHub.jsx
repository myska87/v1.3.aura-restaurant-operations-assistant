import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Star, BarChart3, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Lazy load components
const QualityDashboard = React.lazy(() => import('./QualityDashboard'));
const QualityReports = React.lazy(() => import('./QualityReports'));
const QuickQualityCheck = React.lazy(() => import('./QuickQualityCheck'));
const QualityTemplates = React.lazy(() => import('./QualityTemplates'));
const HygieneDashboard = React.lazy(() => import('./HygieneDashboard'));

const LoadingFallback = () => (
  <Card>
    <CardContent className="p-12 text-center">
      <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </CardContent>
  </Card>
);

export default function QualityDashboardHub() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Star className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Quality & Hygiene</h1>
                <p className="text-gray-600">Quality control, hygiene monitoring, and compliance</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isManager ? 'grid-cols-3' : 'grid-cols-2'} mb-6`}>
              <TabsTrigger value="overview">
                <Star className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="hygiene">
                <BarChart3 className="w-4 h-4 mr-2" />
                Hygiene
              </TabsTrigger>
              {isManager && (
                <TabsTrigger value="manage">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <React.Suspense fallback={<LoadingFallback />}>
                <QualityDashboard />
              </React.Suspense>
            </TabsContent>

            <TabsContent value="hygiene">
              <React.Suspense fallback={<LoadingFallback />}>
                <HygieneDashboard />
              </React.Suspense>
            </TabsContent>

            {isManager && (
              <TabsContent value="manage">
                <Tabs defaultValue="check" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="check">Quick Check</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                  </TabsList>

                  <TabsContent value="check">
                    <React.Suspense fallback={<LoadingFallback />}>
                      <QuickQualityCheck />
                    </React.Suspense>
                  </TabsContent>

                  <TabsContent value="templates">
                    <React.Suspense fallback={<LoadingFallback />}>
                      <QualityTemplates />
                    </React.Suspense>
                  </TabsContent>

                  <TabsContent value="reports">
                    <React.Suspense fallback={<LoadingFallback />}>
                      <QualityReports />
                    </React.Suspense>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}