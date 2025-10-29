import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, BarChart3, Settings } from 'lucide-react';
import QualityDashboard from './QualityDashboard';
import QualityReports from './QualityReports';
import QuickQualityCheck from './QuickQualityCheck';
import QualityTemplates from './QualityTemplates';
import HygieneDashboard from './HygieneDashboard';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

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
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="hygiene" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Hygiene
              </TabsTrigger>
              {isManager && (
                <TabsTrigger value="manage" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Manage
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <QualityDashboard />
            </TabsContent>

            <TabsContent value="hygiene">
              <HygieneDashboard />
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
                    <QuickQualityCheck />
                  </TabsContent>

                  <TabsContent value="templates">
                    <QualityTemplates />
                  </TabsContent>

                  <TabsContent value="reports">
                    <QualityReports />
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