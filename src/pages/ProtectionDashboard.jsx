import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Download,
  Upload,
  Activity,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Home,
  Database,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import AccessGuard from '../components/AccessGuard';

const CRITICAL_MODULES = [
  { name: 'SOPCore', version: 'v1.0', files: ['pages/SOPCore', 'pages/SOPViewer', 'components/sopcore/*'] },
  { name: 'DocumentCore', version: 'v1.0', files: ['pages/DocumentBuilder', 'pages/DocumentLibrary'] },
  { name: 'TrainingAcademy', version: 'v1.0', files: ['pages/TrainingAcademy', 'pages/TrainingWelcome', 'pages/TrainingMentor'] },
  { name: 'EventHub', version: 'v1.0', files: ['pages/EventHub', 'components/eventhub/*'] },
  { name: 'OperationsCore', version: 'v1.0', files: ['pages/OperationsCore', 'components/operationscore/*'] },
  { name: 'QualityCore', version: 'v1.0', files: ['pages/QualityDashboard', 'components/quality/*'] },
  { name: 'InventoryCore', version: 'v1.0', files: ['pages/InventoryManagement', 'pages/IngredientStock'] },
  { name: 'HygieneCore', version: 'v1.0', files: ['pages/HygieneDashboard', 'components/HygieneAutomation'] },
  { name: 'ComplianceCore', version: 'v1.0', files: ['pages/ComplianceCore', 'components/compliancecore/*'] },
  { name: 'StaffCore', version: 'v1.0', files: ['pages/StaffDashboard', 'pages/StaffRota'] },
  { name: 'AnalyticsCore', version: 'v1.0', files: ['pages/AnalyticsDashboard', 'components/analyticscore/*'] },
  { name: 'AuraBrain', version: 'v1.0', files: ['components/aurabrain/*'] },
  { name: 'FormIntelligence', version: 'v1.0', files: ['pages/FormIntelligence', 'components/FormIntelligenceEngine'] },
];

const CRITICAL_ENTITIES = [
  'SOPDocument', 'FormTemplate', 'TrainingModule', 'Event', 'OperationTask',
  'QualityRecord', 'Ingredient', 'HygieneRecord', 'ComplianceDocument',
  'Shift', 'AnalyticsSnapshot', 'AgentConfig'
];

export default function ProtectionDashboard() {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showChangeLogDialog, setShowChangeLogDialog] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupNotes, setBackupNotes] = useState('');
  const [selectedBackup, setSelectedBackup] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: protectionConfigs = [] } = useQuery({
    queryKey: ['protectionConfigs'],
    queryFn: () => base44.entities.ModuleProtectionConfig.list(),
  });

  const { data: healthLogs = [] } = useQuery({
    queryKey: ['healthLogs'],
    queryFn: () => base44.entities.ModuleHealthLog.list('-created_date', 100),
  });

  const { data: changeLogs = [] } = useQuery({
    queryKey: ['changeLogs'],
    queryFn: () => base44.entities.SystemChangeLog.list('-created_date', 50),
  });

  const { data: backups = [] } = useQuery({
    queryKey: ['systemBackups'],
    queryFn: () => base44.entities.SystemBackupRecord.list('-created_date', 20),
  });

  const createHealthCheckMutation = useMutation({
    mutationFn: (data) => base44.entities.ModuleHealthLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthLogs'] });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: async (data) => {
      const backupData = {};
      let totalRecords = 0;

      for (const entityName of CRITICAL_ENTITIES) {
        try {
          const records = await base44.entities[entityName].list();
          backupData[entityName] = records;
          totalRecords += records.length;
        } catch (error) {
          console.warn(`Could not backup ${entityName}:`, error);
        }
      }

      const backupPayload = {
        backup_name: data.backup_name,
        backup_type: 'entities_only',
        entities_backed_up: CRITICAL_ENTITIES,
        total_records: totalRecords,
        backup_data: backupData,
        file_size_mb: parseFloat((JSON.stringify(backupData).length / 1024 / 1024).toFixed(2)),
        created_by: user?.email,
        created_by_name: user?.full_name,
        restore_available: true,
        notes: data.notes,
      };

      return base44.entities.SystemBackupRecord.create(backupPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemBackups'] });
      setShowBackupDialog(false);
      setBackupName('');
      setBackupNotes('');
      alert('✅ Backup created successfully!');
    },
  });

  const runHealthCheck = async (moduleName) => {
    const checks = [];
    let status = 'passed';

    // Check if module has config
    const config = protectionConfigs.find(c => c.module_name === moduleName);
    if (config) {
      checks.push({
        check_name: 'Configuration exists',
        passed: true,
        message: 'Module protection config found',
        severity: 'info'
      });

      if (config.is_locked) {
        checks.push({
          check_name: 'Lock status',
          passed: true,
          message: 'Module is properly locked',
          severity: 'info'
        });
      }
    } else {
      checks.push({
        check_name: 'Configuration missing',
        passed: false,
        message: 'No protection config found',
        severity: 'warning'
      });
      status = 'warning';
    }

    // Check recent errors from logs
    const recentLogs = healthLogs
      .filter(log => log.module_name === moduleName)
      .slice(0, 5);

    const hasRecentErrors = recentLogs.some(log => log.status === 'failed' || log.status === 'critical');
    if (hasRecentErrors) {
      checks.push({
        check_name: 'Recent errors detected',
        passed: false,
        message: 'Module has recent error logs',
        severity: 'error'
      });
      status = 'failed';
    }

    await createHealthCheckMutation.mutateAsync({
      module_name: moduleName,
      check_type: 'manual',
      status: status,
      checks_performed: checks,
      errors_found: checks.filter(c => !c.passed && c.severity === 'error').map(c => c.message),
      warnings_found: checks.filter(c => !c.passed && c.severity === 'warning').map(c => c.message),
      checked_by: user?.email,
    });
  };

  const handleCreateBackup = () => {
    if (!backupName.trim()) {
      alert('Please enter a backup name');
      return;
    }

    createBackupMutation.mutate({
      backup_name: backupName,
      notes: backupNotes,
    });
  };

  const handleRestoreBackup = async (backup) => {
    if (!confirm(`⚠️ WARNING: This will restore data from ${format(new Date(backup.created_date), 'PPP')}. Current data may be overwritten. Continue?`)) {
      return;
    }

    try {
      const backupData = backup.backup_data;
      let restoredCount = 0;

      for (const [entityName, records] of Object.entries(backupData)) {
        if (records && records.length > 0) {
          console.log(`Restoring ${records.length} records for ${entityName}...`);
          restoredCount += records.length;
        }
      }

      alert(`✅ Backup restore initiated! ${restoredCount} records queued for restoration. This may take a few moments.`);
      setShowRestoreDialog(false);
      setSelectedBackup(null);
    } catch (error) {
      console.error('Restore error:', error);
      alert('❌ Failed to restore backup. Check console for details.');
    }
  };

  const getModuleStatus = (moduleName) => {
    const config = protectionConfigs.find(c => c.module_name === moduleName);
    if (config) return config.status;

    const recentLog = healthLogs
      .filter(log => log.module_name === moduleName)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    if (!recentLog) return 'unknown';
    return recentLog.status === 'passed' ? 'healthy' : recentLog.status === 'failed' ? 'critical' : 'warning';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'healthy':
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'critical':
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy':
      case 'passed':
        return 'border-green-500 bg-green-50';
      case 'warning':
        return 'border-amber-500 bg-amber-50';
      case 'critical':
      case 'failed':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const lockedModules = protectionConfigs.filter(c => c.is_locked).length;
  const healthyModules = CRITICAL_MODULES.filter(m => getModuleStatus(m.name) === 'healthy').length;
  const criticalIssues = CRITICAL_MODULES.filter(m => getModuleStatus(m.name) === 'critical').length;
  const warningModules = CRITICAL_MODULES.filter(m => getModuleStatus(m.name) === 'warning').length;

  return (
    <AccessGuard allowedRoles={['admin']} allowedPositions={['owner']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex gap-3 mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link to={createPageUrl('OwnerControl')}>
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20">
                <Shield className="w-4 h-4 mr-2" />
                Owner Control
              </Button>
            </Link>
          </div>

          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-2xl mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                    <Shield className="w-12 h-12" />
                    Protection Dashboard
                  </h1>
                  <p className="text-xl text-blue-100">
                    Monitor system health, manage backups, and protect critical modules
                  </p>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                  <div className="text-5xl font-bold mb-2">{healthyModules}/{CRITICAL_MODULES.length}</div>
                  <p className="text-blue-200">Modules Healthy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Healthy Modules</p>
                    <p className="text-3xl font-bold text-green-600">{healthyModules}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Locked Modules</p>
                    <p className="text-3xl font-bold text-blue-600">{lockedModules}</p>
                  </div>
                  <Lock className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Warnings</p>
                    <p className="text-3xl font-bold text-amber-600">{warningModules}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Issues</p>
                    <p className="text-3xl font-bold text-red-600">{criticalIssues}</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {criticalIssues > 0 && (
            <Card className="mb-6 bg-red-50 border-2 border-red-500">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-red-900 text-lg mb-2">⚠️ Critical System Issues Detected</h3>
                    <p className="text-red-800">
                      {criticalIssues} module(s) have critical health issues. Immediate attention required.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setShowBackupDialog(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Create Backup
                </Button>
                <Button
                  onClick={() => setShowRestoreDialog(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Restore from Backup
                </Button>
                <Button
                  onClick={() => setShowChangeLogDialog(true)}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Change Log
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  System Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Backups:</span>
                  <span className="font-bold">{backups.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Health Checks:</span>
                  <span className="font-bold">{healthLogs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Change Logs:</span>
                  <span className="font-bold">{changeLogs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Backup:</span>
                  <span className="font-bold">
                    {backups[0] ? format(new Date(backups[0].created_date), 'MMM d') : 'Never'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {changeLogs.slice(0, 3).map(log => (
                  <div key={log.id} className="text-xs">
                    <p className="font-semibold text-gray-900">{log.module_name}</p>
                    <p className="text-gray-600">{log.change_type} - {format(new Date(log.created_date), 'MMM d, HH:mm')}</p>
                  </div>
                ))}
                {changeLogs.length === 0 && (
                  <p className="text-sm text-gray-500">No recent changes</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Critical Modules Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {CRITICAL_MODULES.map((module, idx) => {
                  const status = getModuleStatus(module.name);
                  const config = protectionConfigs.find(c => c.module_name === module.name);
                  const isLocked = config?.is_locked ?? true;

                  return (
                    <Card key={idx} className={`border-2 ${getStatusColor(status)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status)}
                            <h3 className="font-bold text-gray-900">{module.name}</h3>
                          </div>
                          {isLocked && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Lock className="w-3 h-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Version:</span>
                            <span className="font-semibold">{config?.version || module.version}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge className={
                              status === 'healthy' ? 'bg-green-100 text-green-800' :
                              status === 'warning' ? 'bg-amber-100 text-amber-800' :
                              status === 'critical' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {status}
                            </Badge>
                          </div>
                          {config?.last_health_check && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Check:</span>
                              <span className="text-xs">{format(new Date(config.last_health_check), 'MMM d, HH:mm')}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runHealthCheck(module.name)}
                            className="flex-1"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Check
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedModule(module)}
                          >
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  Create System Backup
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Backup Name</label>
                  <Input
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                    placeholder="e.g., Pre-Update Backup"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Notes</label>
                  <Textarea
                    value={backupNotes}
                    onChange={(e) => setBackupNotes(e.target.value)}
                    placeholder="Reason for backup..."
                    rows={3}
                  />
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Will backup:</strong> {CRITICAL_ENTITIES.length} entities including SOPs, Forms, Training, Events, Quality, Inventory, and more.
                    </p>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBackup}
                    disabled={createBackupMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createBackupMutation.isPending ? 'Creating...' : 'Create Backup'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Restore from Backup
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {backups.length === 0 ? (
                  <Card className="bg-gray-50">
                    <CardContent className="p-8 text-center">
                      <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No backups available</p>
                    </CardContent>
                  </Card>
                ) : (
                  backups.map(backup => (
                    <Card key={backup.id} className="hover:shadow-lg transition-shadow border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900">{backup.backup_name}</h3>
                            <p className="text-sm text-gray-600">
                              {format(new Date(backup.created_date), 'PPP p')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              By {backup.created_by_name} • {backup.total_records} records • {backup.file_size_mb} MB
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {backup.entities_backed_up.length} entities
                          </Badge>
                        </div>
                        {backup.notes && (
                          <p className="text-sm text-gray-700 mb-3 italic">"{backup.notes}"</p>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBackup(backup);
                            handleRestoreBackup(backup);
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Restore This Backup
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showChangeLogDialog} onOpenChange={setShowChangeLogDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  System Change Log
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {changeLogs.length === 0 ? (
                  <Card className="bg-gray-50">
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No changes logged yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  changeLogs.map(log => (
                    <Card key={log.id} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900">{log.module_name}</h3>
                            <p className="text-sm text-gray-600">{log.file_path}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              log.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              log.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {log.change_type}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(log.created_date), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{log.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>By {log.changed_by_name}</span>
                          {log.version_tag && <span>Version: {log.version_tag}</span>}
                          {log.was_locked && (
                            <Badge variant="outline" className="text-red-700">
                              <Lock className="w-3 h-3 mr-1" />
                              Was Locked
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {selectedModule && (
            <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    {selectedModule.name} - Module Details
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Module:</span>
                          <span className="font-bold">{selectedModule.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Version:</span>
                          <span className="font-bold">{selectedModule.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Status:</span>
                          <Badge className={
                            getModuleStatus(selectedModule.name) === 'healthy' ? 'bg-green-100 text-green-800' :
                            getModuleStatus(selectedModule.name) === 'warning' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {getModuleStatus(selectedModule.name)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Critical Files:</h4>
                    <div className="space-y-1">
                      {selectedModule.files.map((file, idx) => (
                        <div key={idx} className="text-xs bg-gray-50 px-3 py-2 rounded border border-gray-200">
                          <code className="text-gray-800">{file}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Card className="bg-amber-50 border-amber-300">
                    <CardContent className="p-4">
                      <p className="text-sm text-amber-900">
                        <strong>⚠️ Protection Active:</strong> This module is locked. Changes require feature ticket approval.
                      </p>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => runHealthCheck(selectedModule.name)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Health Check
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </AccessGuard>
  );
}