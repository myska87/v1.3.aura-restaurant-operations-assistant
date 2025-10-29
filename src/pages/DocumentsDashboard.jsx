import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3, Settings } from 'lucide-react';
import DocumentLibrary from './DocumentLibrary';
import DocumentBuilder from './DocumentBuilder';
import DocumentSignatureReport from './DocumentSignatureReport';
import ComplianceCore from './ComplianceCore';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function DocumentsDashboard() {
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
              <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Documents & Compliance</h1>
                <p className="text-gray-600">Policies, procedures, and compliance documents</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Library
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Compliance
              </TabsTrigger>
              {isManager && (
                <TabsTrigger value="manage" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Manage
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <DocumentLibrary />
            </TabsContent>

            <TabsContent value="compliance">
              <ComplianceCore />
            </TabsContent>

            {isManager && (
              <TabsContent value="manage">
                <Tabs defaultValue="builder" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="builder">Document Builder</TabsTrigger>
                    <TabsTrigger value="reports">Signature Reports</TabsTrigger>
                  </TabsList>

                  <TabsContent value="builder">
                    <DocumentBuilder />
                  </TabsContent>

                  <TabsContent value="reports">
                    <DocumentSignatureReport />
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