import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Home,
  Shield,
  Database,
  Link as LinkIcon,
  FileText,
  Users,
  Calendar,
  Package,
  Star,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function SystemHealthCheck() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  // Entity Health Checks
  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItemsHealth'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredientsHealth'],
    queryFn: () => base44.entities.Ingredient.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shiftsHealth'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: sops = [] } = useQuery({
    queryKey: ['sopsHealth'],
    queryFn: () => base44.entities.SOPDocument.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documentsHealth'],
    queryFn: () => base44.entities.DocumentBuilder.list(),
  });

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['qualityHealth'],
    queryFn: () => base44.entities.QualityRecord.list(),
  });

  const { data: formTemplates = [] } = useQuery({
    queryKey: ['formsHealth'],
    queryFn: () => base44.entities.FormTemplate.list(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staffHealth'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activitiesHealth'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 50),
  });

  // Calculate health scores
  const healthChecks = [
    {
      name: 'Menu System',
      icon: Package,
      status: menuItems.length >= 20 ? 'healthy' : menuItems.length >= 10 ? 'warning' : 'error',
      count: menuItems.length,
      expected: 20,
      message: menuItems.length >= 20 ? 'Menu fully populated' : 'Add more menu items',
      link: createPageUrl('MenuManagement'),
    },
    {
      name: 'Ingredient Database',
      icon: Database,
      status: ingredients.length >= 30 ? 'healthy' : ingredients.length >= 15 ? 'warning' : 'error',
      count: ingredients.length,
      expected: 30,
      message: ingredients.length >= 30 ? 'Ingredients configured' : 'Add more ingredients',
      link: createPageUrl('IngredientStock'),
    },
    {
      name: 'Shift Scheduling',
      icon: Calendar,
      status: shifts.length >= 10 ? 'healthy' : shifts.length >= 5 ? 'warning' : 'error',
      count: shifts.length,
      expected: 10,
      message: shifts.length >= 10 ? 'Shifts scheduled' : 'Create more shifts',
      link: createPageUrl('StaffRota'),
    },
    {
      name: 'SOP Library',
      icon: FileText,
      status: sops.length >= 10 ? 'healthy' : sops.length >= 5 ? 'warning' : 'error',
      count: sops.length,
      expected: 10,
      message: sops.length >= 10 ? 'SOPs documented' : 'Create more SOPs',
      link: createPageUrl('SOPDashboard'),
    },
    {
      name: 'Document Library',
      icon: FileText,
      status: documents.length >= 5 ? 'healthy' : documents.length >= 3 ? 'warning' : 'error',
      count: documents.length,
      expected: 5,
      message: documents.length >= 5 ? 'Documents ready' : 'Add more documents',
      link: createPageUrl('DocumentLibrary'),
    },
    {
      name: 'Quality System',
      icon: Star,
      status: qualityRecords.length >= 20 ? 'healthy' : qualityRecords.length >= 5 ? 'warning' : 'error',
      count: qualityRecords.length,
      expected: 20,
      message: qualityRecords.length >= 20 ? 'Quality tracking active' : 'Start quality checks',
      link: createPageUrl('QualityDashboard'),
    },
    {
      name: 'Forms & Compliance',
      icon: Shield,
      status: formTemplates.length >= 5 ? 'healthy' : formTemplates.length >= 3 ? 'warning' : 'error',
      count: formTemplates.length,
      expected: 5,
      message: formTemplates.length >= 5 ? 'Forms configured' : 'Create more forms',
      link: createPageUrl('FormLibrary'),
    },
    {
      name: 'Staff Database',
      icon: Users,
      status: staff.length >= 5 ? 'healthy' : staff.length >= 2 ? 'warning' : 'error',
      count: staff.length,
      expected: 5,
      message: staff.length >= 5 ? 'Team ready' : 'Invite more staff',
      link: createPageUrl('UserManagement'),
    },
    {
      name: 'Activity Tracking',
      icon: Activity,
      status: activities.length >= 10 ? 'healthy' : activities.length >= 1 ? 'warning' : 'error',
      count: activities.length,
      expected: 10,
      message: activities.length >= 10 ? 'Activities being tracked' : 'System warming up',
      link: createPageUrl('Dashboard'),
    },
  ];

  const healthyCount = healthChecks.filter(c => c.status === 'healthy').length;
  const warningCount = healthChecks.filter(c => c.status === 'warning').length;
  const errorCount = healthChecks.filter(c => c.status === 'error').length;
  const overallHealth = Math.round((healthyCount / healthChecks.length) * 100);

  const getStatusIcon = (status) => {
    if (status === 'healthy') return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (status === 'warning') return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    return <XCircle className="w-6 h-6 text-red-600" />;
  };

  const getStatusColor = (status) => {
    if (status === 'healthy') return 'bg-green-50 border-green-200';
    if (status === 'warning') return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">System Health Check is only accessible to Administrators.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">System Health Check</h1>
              <p className="text-gray-600">Monitor all features and identify issues</p>
            </div>
          </div>
        </div>

        {/* Overall Health Score */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-blue-100 mb-2">Overall System Health</p>
              <p className="text-6xl font-bold mb-4">{overallHealth}%</p>
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>{healthyCount} Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>{warningCount} Warnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>{errorCount} Issues</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Checks Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {healthChecks.map((check, index) => {
            const Icon = check.icon;
            
            return (
              <motion.div
                key={check.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`border-2 ${getStatusColor(check.status)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Icon className="w-8 h-8 text-gray-700" />
                        <div>
                          <h3 className="font-bold text-gray-900">{check.name}</h3>
                          <p className="text-sm text-gray-600">{check.message}</p>
                        </div>
                      </div>
                      {getStatusIcon(check.status)}
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-bold">{check.count} / {check.expected}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            check.status === 'healthy' ? 'bg-green-500' :
                            check.status === 'warning' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (check.count / check.expected) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <Link to={check.link}>
                      <Button variant="outline" size="sm" className="w-full">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Go to {check.name}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}