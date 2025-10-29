import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Lock,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  UserX,
  Activity,
  Clock,
  Home,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function SecurityDashboard() {
  const queryClient = useQueryClient();
  const [showKeys, setShowKeys] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['complianceAudits'],
    queryFn: () => base44.entities.ComplianceAudit.list('-created_date', 50),
  });

  const { data: securityIncidents = [] } = useQuery({
    queryKey: ['securityIncidents'],
    queryFn: () => base44.entities.ComplianceSecurityIncident.filter({ status: { $in: ['open', 'investigating'] } }),
  });

  const isOwner = user?.role === 'admin' || user?.position === 'owner';

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Security Dashboard is only accessible to owners and administrators.
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeUsers = allUsers.filter(u => u.is_active !== false);
  const inactiveUsers = allUsers.filter(u => u.is_active === false);
  const adminUsers = allUsers.filter(u => u.role === 'admin' || u.position === 'owner');

  const suspiciousActivities = complianceAudits.filter(audit => audit.severity === 'critical');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('SettingsDashboard')}>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Security Dashboard</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Monitor security, access control, and system integrity
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Users</p>
                  <p className="text-3xl font-bold text-green-600">{activeUsers.length}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Inactive Users</p>
                  <p className="text-3xl font-bold text-amber-600">{inactiveUsers.length}</p>
                </div>
                <UserX className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Admins</p>
                  <p className="text-3xl font-bold text-blue-600">{adminUsers.length}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Security Incidents</p>
                  <p className="text-3xl font-bold text-red-600">{securityIncidents.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Alerts */}
        {securityIncidents.length > 0 && (
          <Card className="bg-red-50 border-red-200 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Active Security Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityIncidents.map(incident => (
                  <div key={incident.id} className="p-4 bg-white rounded-lg border border-red-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{incident.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                        <div className="flex gap-2">
                          <Badge className="bg-red-100 text-red-800">{incident.severity}</Badge>
                          <Badge variant="outline">{incident.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Audit Activity */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Audit Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suspiciousActivities.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">No suspicious activities detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suspiciousActivities.slice(0, 10).map(audit => (
                  <div key={audit.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{audit.action_description}</p>
                        <p className="text-xs text-gray-600">
                          {audit.user_name} • {format(new Date(audit.created_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">{audit.severity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Access Overview */}
        <Card>
          <CardHeader>
            <CardTitle>User Access Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allUsers.slice(0, 20).map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${u.is_active !== false ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-600">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {u.position || 'staff'}
                    </Badge>
                    {(u.role === 'admin' || u.position === 'owner') && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}