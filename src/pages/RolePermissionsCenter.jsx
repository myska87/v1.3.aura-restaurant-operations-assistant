import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Lock,
  Home,
  AlertCircle,
  Save,
  RefreshCw,
  CheckCircle,
  X,
  Copy,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

const ROLES = [
  { value: 'owner', label: 'Owner', icon: '👑', color: 'purple' },
  { value: 'manager', label: 'Manager', icon: '👔', color: 'blue' },
  { value: 'chef', label: 'Chef', icon: '👨‍🍳', color: 'orange' },
  { value: 'sous_chef', label: 'Sous Chef', icon: '🔪', color: 'orange' },
  { value: 'line_cook', label: 'Line Cook', icon: '🍳', color: 'orange' },
  { value: 'server', label: 'Server', icon: '🍽️', color: 'green' },
  { value: 'bartender', label: 'Bartender', icon: '🍸', color: 'green' },
  { value: 'host', label: 'Host', icon: '👋', color: 'green' },
  { value: 'cleaner', label: 'Cleaner', icon: '🧹', color: 'teal' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: 'gray' },
  { value: 'dishwasher', label: 'Dishwasher', icon: '🍴', color: 'gray' },
];

const FEATURES = [
  // Core Features
  { key: 'dashboard.view', name: 'Dashboard', category: 'core', system_required: true },
  { key: 'my_shifts.view', name: 'My Shifts', category: 'core', system_required: true },
  { key: 'my_tasks.view', name: 'My Tasks', category: 'core', system_required: true },
  { key: 'clock_in_out.access', name: 'Clock In/Out', category: 'core', system_required: true },
  { key: 'team_chat.access', name: 'Team Chat', category: 'core', system_required: true },
  
  // Staff Management
  { key: 'staff.view', name: 'Staff Hub Access', category: 'staff' },
  { key: 'staff.directory', name: 'Team Directory', category: 'staff' },
  { key: 'staff.rota', name: 'Staff Rota Management', category: 'staff' },
  { key: 'staff.payroll', name: 'Payroll Access', category: 'staff' },
  { key: 'staff.analytics', name: 'Staff Analytics', category: 'staff' },
  
  // Operations
  { key: 'operations.hub', name: 'Operations Hub', category: 'operations' },
  { key: 'forms.complete', name: 'Complete Forms', category: 'operations', system_required: true },
  { key: 'forms.create', name: 'Create Forms', category: 'operations' },
  { key: 'checklists.execute', name: 'Execute Checklists', category: 'operations', system_required: true },
  { key: 'checklists.manage', name: 'Manage Checklists', category: 'operations' },
  
  // Inventory & Menu
  { key: 'inventory.view', name: 'View Inventory', category: 'inventory' },
  { key: 'inventory.edit', name: 'Edit Stock Levels', category: 'inventory' },
  { key: 'inventory.order', name: 'Create Orders', category: 'inventory' },
  { key: 'suppliers.manage', name: 'Manage Suppliers', category: 'inventory' },
  { key: 'menu.view', name: 'View Menu', category: 'inventory' },
  { key: 'menu.manage', name: 'Manage Menu Items', category: 'inventory' },
  
  // Quality & Compliance
  { key: 'quality.view', name: 'Quality Dashboard', category: 'quality' },
  { key: 'quality.checks', name: 'Perform Quality Checks', category: 'quality' },
  { key: 'hygiene.access', name: 'Hygiene Central', category: 'quality' },
  { key: 'sops.view', name: 'View SOPs', category: 'quality', system_required: true },
  { key: 'sops.create', name: 'Create SOPs', category: 'quality' },
  
  // Documents
  { key: 'documents.view', name: 'View Documents', category: 'documents', system_required: true },
  { key: 'documents.create', name: 'Create Documents', category: 'documents' },
  { key: 'documents.sign', name: 'Sign Documents', category: 'documents', system_required: true },
  
  // Reports & Analytics
  { key: 'reports.view', name: 'View Reports', category: 'reports' },
  { key: 'analytics.access', name: 'Analytics Dashboard', category: 'reports' },
  
  // Settings
  { key: 'settings.access', name: 'Settings Access', category: 'settings' },
  { key: 'settings.users', name: 'User Management', category: 'settings' },
  { key: 'settings.data', name: 'Data Management', category: 'settings' },
  { key: 'settings.permissions', name: 'Role Permissions', category: 'settings' },
];

const DEFAULT_PERMISSIONS = {
  owner: 'all',
  admin: 'all',
  manager: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'staff.view', 'staff.directory', 'staff.rota', 'staff.payroll', 'staff.analytics', 'operations.hub', 'forms.complete', 'forms.create', 'checklists.execute', 'checklists.manage', 'inventory.view', 'inventory.edit', 'inventory.order', 'suppliers.manage', 'menu.view', 'menu.manage', 'quality.view', 'quality.checks', 'hygiene.access', 'sops.view', 'sops.create', 'documents.view', 'documents.create', 'documents.sign', 'reports.view', 'analytics.access', 'settings.access', 'settings.users'],
  chef: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'inventory.view', 'inventory.edit', 'menu.view', 'menu.manage', 'quality.view', 'quality.checks', 'hygiene.access', 'sops.view', 'documents.view', 'documents.sign'],
  sous_chef: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'inventory.view', 'menu.view', 'quality.checks', 'hygiene.access', 'sops.view', 'documents.view', 'documents.sign'],
  line_cook: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'menu.view', 'quality.checks', 'sops.view', 'documents.view', 'documents.sign'],
  server: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'menu.view', 'sops.view', 'documents.view', 'documents.sign'],
  bartender: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'menu.view', 'sops.view', 'documents.view', 'documents.sign'],
  host: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'menu.view', 'sops.view', 'documents.view', 'documents.sign'],
  cleaner: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'quality.checks', 'hygiene.access', 'sops.view', 'documents.view', 'documents.sign'],
  maintenance: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'sops.view', 'documents.view', 'documents.sign'],
  dishwasher: ['dashboard.view', 'my_shifts.view', 'my_tasks.view', 'clock_in_out.access', 'team_chat.access', 'forms.complete', 'checklists.execute', 'sops.view', 'documents.view', 'documents.sign'],
};

export default function RolePermissionsCenter() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('chef');
  const [changes, setChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cloneFromRole, setCloneFromRole] = useState('');
  const [cloneToRole, setCloneToRole] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list(),
  });

  const { data: changeLogs = [] } = useQuery({
    queryKey: ['permissionChangeLogs'],
    queryFn: () => base44.entities.PermissionChangeLog.list('-created_date', 100),
  });

  const isOwner = user?.role === 'admin' || user?.position === 'owner';

  const initializePermissionsMutation = useMutation({
    mutationFn: async () => {
      const toCreate = [];
      
      for (const role of ROLES) {
        const rolePermissions = DEFAULT_PERMISSIONS[role.value] || [];
        
        for (const feature of FEATURES) {
          const isEnabled = rolePermissions === 'all' || rolePermissions.includes(feature.key);
          
          toCreate.push({
            role_name: role.value,
            feature_key: feature.key,
            feature_name: feature.name,
            feature_category: feature.category,
            is_enabled: isEnabled,
            permission_level: 'view',
            is_system_required: feature.system_required || false,
            description: `Access to ${feature.name}`,
            updated_by: user.email,
            updated_by_name: user.full_name,
          });
        }
      }

      await base44.entities.RolePermission.bulkCreate(toCreate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      alert('✅ Permissions initialized successfully!');
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ permission, isEnabled }) => {
      // Log the change
      await base44.entities.PermissionChangeLog.create({
        admin_id: user.id,
        admin_email: user.email,
        admin_name: user.full_name,
        role_changed: permission.role_name,
        feature_key: permission.feature_key,
        feature_name: permission.feature_name,
        old_value: permission.is_enabled,
        new_value: isEnabled,
        change_type: isEnabled ? 'enabled' : 'disabled',
      });

      // Update permission
      await base44.entities.RolePermission.update(permission.id, {
        is_enabled: isEnabled,
        updated_by: user.email,
        updated_by_name: user.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionChangeLogs'] });
    },
  });

  const clonePermissionsMutation = useMutation({
    mutationFn: async ({ fromRole, toRole }) => {
      const fromPermissions = permissions.filter(p => p.role_name === fromRole);
      const toPermissions = permissions.filter(p => p.role_name === toRole);

      for (const fromPerm of fromPermissions) {
        const toPerm = toPermissions.find(p => p.feature_key === fromPerm.feature_key);
        if (toPerm && toPerm.is_enabled !== fromPerm.is_enabled) {
          await base44.entities.PermissionChangeLog.create({
            admin_id: user.id,
            admin_email: user.email,
            admin_name: user.full_name,
            role_changed: toRole,
            feature_key: toPerm.feature_key,
            feature_name: toPerm.feature_name,
            old_value: toPerm.is_enabled,
            new_value: fromPerm.is_enabled,
            change_type: 'cloned',
            notes: `Cloned from ${fromRole}`,
          });

          await base44.entities.RolePermission.update(toPerm.id, {
            is_enabled: fromPerm.is_enabled,
            updated_by: user.email,
            updated_by_name: user.full_name,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionChangeLogs'] });
      setCloneFromRole('');
      setCloneToRole('');
      alert('✅ Permissions cloned successfully!');
    },
  });

  const resetPermissionsMutation = useMutation({
    mutationFn: async (role) => {
      const rolePermissions = permissions.filter(p => p.role_name === role);
      const defaultPerms = DEFAULT_PERMISSIONS[role] || [];

      for (const perm of rolePermissions) {
        const shouldBeEnabled = defaultPerms === 'all' || defaultPerms.includes(perm.feature_key);
        
        if (perm.is_enabled !== shouldBeEnabled) {
          await base44.entities.PermissionChangeLog.create({
            admin_id: user.id,
            admin_email: user.email,
            admin_name: user.full_name,
            role_changed: role,
            feature_key: perm.feature_key,
            feature_name: perm.feature_name,
            old_value: perm.is_enabled,
            new_value: shouldBeEnabled,
            change_type: 'reset',
          });

          await base44.entities.RolePermission.update(perm.id, {
            is_enabled: shouldBeEnabled,
            updated_by: user.email,
            updated_by_name: user.full_name,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionChangeLogs'] });
      alert('✅ Permissions reset to defaults!');
    },
  });

  const handleToggle = (permission, newValue) => {
    if (permission.is_system_required) {
      alert('⚠️ This is a system-required feature and cannot be disabled.');
      return;
    }

    setChanges({
      ...changes,
      [permission.id]: newValue,
    });
    setHasUnsavedChanges(true);
  };

  const saveChanges = async () => {
    for (const [permissionId, isEnabled] of Object.entries(changes)) {
      const permission = permissions.find(p => p.id === permissionId);
      if (permission) {
        await updatePermissionMutation.mutateAsync({ permission, isEnabled });
      }
    }
    setChanges({});
    setHasUnsavedChanges(false);
    alert('✅ Permissions saved successfully! Changes will apply after users refresh.');
  };

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Role Permissions Center is only accessible to owners and administrators.
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

  const rolePermissions = permissions.filter(p => p.role_name === selectedRole);
  const categorizedFeatures = FEATURES.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {});

  const needsInitialization = permissions.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('SettingsDashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-10 h-10 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">Role Permissions Center</h1>
            </div>
            <p className="text-gray-600 text-lg">
              Control feature access for each position across the entire app
            </p>
          </div>
          {hasUnsavedChanges && (
            <Button onClick={saveChanges} size="lg" className="bg-green-600 hover:bg-green-700">
              <Save className="w-5 h-5 mr-2" />
              Save Changes
            </Button>
          )}
        </div>

        {needsInitialization && (
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Initialize Permissions</h3>
                  <p className="text-gray-700 mb-4">
                    No permissions configured yet. Click below to initialize default permissions for all roles.
                  </p>
                  <Button
                    onClick={() => initializePermissionsMutation.mutate()}
                    disabled={initializePermissionsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {initializePermissionsMutation.isPending ? 'Initializing...' : 'Initialize Permissions'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="permissions">
          <TabsList className="mb-6">
            <TabsTrigger value="permissions">
              <Shield className="w-4 h-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Copy className="w-4 h-4 mr-2" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Activity className="w-4 h-4 mr-2" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <div className="grid md:grid-cols-4 gap-6">
              {/* Left Panel - Roles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ROLES.map(role => (
                      <button
                        key={role.value}
                        onClick={() => setSelectedRole(role.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                          selectedRole === role.value
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        <span className="text-2xl">{role.icon}</span>
                        <div className="text-left flex-1">
                          <p className="font-semibold">{role.label}</p>
                          {role.value === 'owner' && (
                            <p className={`text-xs ${selectedRole === role.value ? 'text-blue-100' : 'text-gray-500'}`}>
                              Full Access
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Right Panel - Permissions Grid */}
              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Permissions for {ROLES.find(r => r.value === selectedRole)?.label}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {rolePermissions.filter(p => changes[p.id] !== undefined ? changes[p.id] : p.is_enabled).length} / {FEATURES.length} Enabled
                        </Badge>
                        {selectedRole !== 'owner' && selectedRole !== 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Reset ${ROLES.find(r => r.value === selectedRole)?.label} permissions to defaults?`)) {
                                resetPermissionsMutation.mutate(selectedRole);
                              }
                            }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedRole === 'owner' ? (
                      <div className="p-12 text-center">
                        <Shield className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Owner Has Full Access
                        </h3>
                        <p className="text-gray-600">
                          Owners have unrestricted access to all features and cannot be limited.
                        </p>
                      </div>
                    ) : isLoading ? (
                      <div className="p-12 text-center">
                        <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                        <p className="text-gray-600">Loading permissions...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(categorizedFeatures).map(([category, features]) => (
                          <div key={category}>
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">
                              {category}
                            </h3>
                            <div className="space-y-2">
                              {features.map(feature => {
                                const permission = rolePermissions.find(p => p.feature_key === feature.key);
                                if (!permission) return null;
                                
                                const isEnabled = changes[permission.id] !== undefined 
                                  ? changes[permission.id] 
                                  : permission.is_enabled;

                                return (
                                  <div
                                    key={feature.key}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                                      isEnabled 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">{feature.name}</p>
                                      {feature.system_required && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          🔒 System Required
                                        </p>
                                      )}
                                    </div>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={(value) => handleToggle(permission, value)}
                                      disabled={feature.system_required}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="w-5 h-5 text-blue-600" />
                    Clone Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Clone From</label>
                    <Select value={cloneFromRole} onValueChange={setCloneFromRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter(r => r.value !== 'owner').map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.icon} {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Clone To</label>
                    <Select value={cloneToRole} onValueChange={setCloneToRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter(r => r.value !== 'owner' && r.value !== cloneFromRole).map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.icon} {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => clonePermissionsMutation.mutate({ fromRole: cloneFromRole, toRole: cloneToRole })}
                    disabled={!cloneFromRole || !cloneToRole || clonePermissionsMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {clonePermissionsMutation.isPending ? 'Cloning...' : 'Clone Permissions'}
                  </Button>

                  <p className="text-xs text-gray-500">
                    Copy all permission settings from one role to another. Useful for creating custom roles.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                    Reset to Defaults
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Reset any role back to its default permission settings.
                  </p>

                  <div className="space-y-2">
                    {ROLES.filter(r => r.value !== 'owner').map(role => (
                      <Button
                        key={role.value}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          if (confirm(`Reset ${role.label} to default permissions?`)) {
                            resetPermissionsMutation.mutate(role.value);
                          }
                        }}
                        disabled={resetPermissionsMutation.isPending}
                      >
                        <span className="mr-2">{role.icon}</span>
                        Reset {role.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Permission Change Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                {changeLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No permission changes yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {changeLogs.map(log => (
                      <div key={log.id} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="capitalize">{log.role_changed}</Badge>
                              <Badge variant="outline">{log.change_type}</Badge>
                            </div>
                            <p className="text-sm text-gray-900 font-medium mb-1">
                              {log.feature_name}: {log.old_value ? 'Enabled' : 'Disabled'} → {log.new_value ? 'Enabled' : 'Disabled'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {log.admin_name} • {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                            {log.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">"{log.notes}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Notice */}
        {hasUnsavedChanges && (
          <Card className="mt-6 bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <p className="text-amber-900 font-medium">
                    You have unsaved changes. Click "Save Changes" to apply.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setChanges({});
                      setHasUnsavedChanges(false);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Discard
                  </Button>
                  <Button onClick={saveChanges} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}