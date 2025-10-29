import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  Link as LinkIcon,
  TrendingUp,
  Shield,
  CheckCircle,
  Clock,
  Award,
  Home,
  ArrowLeft,
  Plus,
  Search,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SOPCoreProvider, { useSOPCoreContext } from '../components/sopcore/SOPCoreProvider';

function SOPCoreContent() {
  const { sops, certifications, signatures, menuLinks, api } = useSOPCoreContext();
  
  const analytics = api.getAnalytics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
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

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#014D40] to-emerald-600 bg-clip-text text-transparent mb-2">
              📚 SOPCore Management
            </h1>
            <p className="text-gray-600 text-lg">
              Central hub for Standard Operating Procedures across Chai Patta operations
            </p>
          </div>

          <div className="flex gap-3">
            <Link to={createPageUrl("SOPBuilder")}>
              <Button className="bg-[#014D40] hover:bg-[#013830]">
                <Plus className="w-4 h-4 mr-2" />
                Create SOP
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">Active</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{analytics.activeSOPs}</p>
              <p className="text-blue-100 text-sm">Active SOPs</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">Complete</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{analytics.completedCertifications}</p>
              <p className="text-green-100 text-sm">Certifications</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <LinkIcon className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">Links</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{analytics.linkedMenuItems}</p>
              <p className="text-purple-100 text-sm">Menu Links</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">Rate</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{analytics.averageCompletionRate}%</p>
              <p className="text-amber-100 text-sm">Completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link to={createPageUrl("SOPDashboard")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <FileText className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Browse SOPs</h3>
                <p className="text-gray-600 mb-4">
                  View and search all Standard Operating Procedures
                </p>
                <Button variant="outline" className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  View Library
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("SOPCertifications")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <Award className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Certifications</h3>
                <p className="text-gray-600 mb-4">
                  Track staff training and certification progress
                </p>
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  View Progress
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <BarChart3 className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics</h3>
              <p className="text-gray-600 mb-4">
                View SOPCore performance metrics and insights
              </p>
              <Button variant="outline" className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Module Info */}
        <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-900">
              <Shield className="w-5 h-5" />
              SOPCore Module Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-teal-900 mb-2">🔹 Core Features</h4>
                <ul className="space-y-2 text-sm text-teal-800">
                  <li>✅ Independent SOP management system</li>
                  <li>✅ Version control and audit trails</li>
                  <li>✅ Staff certification tracking</li>
                  <li>✅ Menu item integration</li>
                  <li>✅ Digital signature collection</li>
                  <li>✅ Analytics and reporting</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-teal-900 mb-2">🔒 Security</h4>
                <ul className="space-y-2 text-sm text-teal-800">
                  <li>✅ Secure internal APIs only</li>
                  <li>✅ No direct database modifications</li>
                  <li>✅ All changes versioned</li>
                  <li>✅ Read-only external integrations</li>
                  <li>✅ Complete audit logging</li>
                  <li>✅ GDPR compliant</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SOPCore() {
  return (
    <SOPCoreProvider>
      <SOPCoreContent />
    </SOPCoreProvider>
  );
}