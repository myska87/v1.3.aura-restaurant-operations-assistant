import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, BarChart3, Settings } from 'lucide-react';
import SOPDashboard from './SOPDashboard';
import SOPCertifications from './SOPCertifications';
import SOPBuilder from './SOPBuilder';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function SOPsDashboard() {
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
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">SOPs & Procedures</h1>
                <p className="text-gray-600">Standard operating procedures and training materials</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Browse SOPs
              </TabsTrigger>
              <TabsTrigger value="certifications" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                My Certifications
              </TabsTrigger>
              {isManager && (
                <TabsTrigger value="manage" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Manage
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <SOPDashboard />
            </TabsContent>

            <TabsContent value="certifications">
              <SOPCertifications />
            </TabsContent>

            {isManager && (
              <TabsContent value="manage">
                <SOPBuilder />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}