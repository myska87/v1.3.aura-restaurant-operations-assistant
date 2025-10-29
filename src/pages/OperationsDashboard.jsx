import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Target, BarChart3, Settings } from 'lucide-react';
import OperationsCore from './OperationsCore';
import MyTasks from './MyTasks';
import DashboardPro from './DashboardPro';
import TaskReports from './TaskReports';
import EventFeed from './EventFeed';

export default function OperationsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Operations Hub</h1>
                <p className="text-gray-600">Centralized operations management and tracking</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="mywork" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                My Work
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OperationsCore />
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardContent className="p-6">
                  <TaskReports />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mywork">
              <div className="space-y-6">
                <MyTasks />
                <EventFeed />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}