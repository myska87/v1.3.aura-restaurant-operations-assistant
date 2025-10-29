import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Lock,
  Eye,
  Edit,
  Trash2,
  Plus,
  Users,
  AlertTriangle,
  CheckCircle,
  Search,
  ArrowLeft,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { permissions, getRoleLevel, isManager, isAdmin } from '../components/PermissionsConfig';
import { SecurityBadge } from '../components/PermissionGuard';

export default function SecurityDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Only managers can view this page
  if (!isManager(user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              This page is only available to Managers and Administrators.
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

  // Get all entities from permissions
  const entities = Object.keys(permissions);

  // Filter entities by search
  const filteredEntities = entities.filter(entity =>
    entity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get permission summary for an entity
  const getPermissionSummary = (entityName) => {
    const entityPerms = permissions[entityName];
    const canRead = entityPerms.canRead(user);
    const canCreate = entityPerms.canCreate(user);
    const canUpdate = entityPerms.canUpdate(user);
    const canDelete = entityPerms.canDelete(user);

    return { canRead, canCreate, canUpdate, canDelete };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex gap-3">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('ComplianceDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Compliance
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-none shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-3 mb-2">
                  <Shield className="w-8 h-8" />
                  Security & Permissions
                </CardTitle>
                <p className="text-white/90 text-lg">
                  Role-Based Access Control (RBAC) System
                </p>
              </div>
              <SecurityBadge user={user} />
            </div>
          </CardHeader>
        </Card>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Access Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium mb-1">Full Name</p>
                <p className="text-lg font-bold text-blue-900">{user?.full_name}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium mb-1">Position</p>
                <p className="text-lg font-bold text-green-900 capitalize">{user?.position || 'Staff'}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium mb-1">Role Level</p>
                <p className="text-lg font-bold text-purple-900">{getRoleLevel(user)} / 100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        <div className="grid gap-4">
          {filteredEntities.map((entityName) => {
            const perms = getPermissionSummary(entityName);
            const permissionCount = [perms.canRead, perms.canCreate, perms.canUpdate, perms.canDelete].filter(Boolean).length;

            return (
              <Card key={entityName} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{entityName}</h3>
                      
                      <div className="flex flex-wrap gap-2">
                        {perms.canRead && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Read
                          </Badge>
                        )}
                        {perms.canCreate && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            Create
                          </Badge>
                        )}
                        {perms.canUpdate && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                            <Edit className="w-3 h-3" />
                            Update
                          </Badge>
                        )}
                        {perms.canDelete && (
                          <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Badge>
                        )}
                        {permissionCount === 0 && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            No Access
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {permissionCount === 4 ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : permissionCount > 0 ? (
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Security Information</h4>
                <p className="text-sm text-blue-700">
                  All access attempts are logged in the Compliance Audit Trail. 
                  Your permissions are based on your role and position. 
                  Contact an administrator if you need additional access.
                </p>
                <Link to={createPageUrl('ComplianceDashboard')}>
                  <Button variant="link" className="text-blue-700 px-0 mt-2">
                    View Audit Trail →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}