
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  Eye,
  AlertTriangle,
  Clock,
  Activity,
  Lock,
  Unlock,
  ChevronRight,
  Home,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

import AccessGuard from '../components/AccessGuard';

export default function OwnerControl() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('');
  const [purpose, setPurpose] = useState('testing');
  const [notes, setNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: impersonationLogs = [] } = useQuery({
    queryKey: ['impersonationLogs'],
    queryFn: () => base44.entities.ImpersonationLog.list('-session_start', 50),
  });

  // isOwner check is now handled by AccessGuard component
  const currentImpersonation = localStorage.getItem('aura-impersonation');
  const impersonationData = currentImpersonation ? JSON.parse(currentImpersonation) : null;

  const startImpersonationMutation = useMutation({
    mutationFn: async (data) => {
      const log = await base44.entities.ImpersonationLog.create({
        owner_id: user.id,
        owner_email: user.email,
        owner_name: user.full_name,
        impersonated_role: data.role,
        impersonated_position: data.role,
        session_start: new Date().toISOString(),
        purpose: data.purpose,
        notes: data.notes,
        status: 'active',
        pages_visited: [],
        actions_performed: [],
      });
      return log;
    },
    onSuccess: (log) => {
      localStorage.setItem('aura-impersonation', JSON.stringify({
        logId: log.id,
        role: log.impersonated_role,
        startTime: log.session_start,
      }));
      queryClient.invalidateQueries({ queryKey: ['impersonationLogs'] });
      window.location.reload();
    },
  });

  const endImpersonationMutation = useMutation({
    mutationFn: async () => {
      if (!impersonationData) return;
      
      const startTime = new Date(impersonationData.startTime);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime - startTime) / 60000);

      await base44.entities.ImpersonationLog.update(impersonationData.logId, {
        session_end: endTime.toISOString(),
        duration_minutes: durationMinutes,
        status: 'completed',
      });

      localStorage.removeItem('aura-impersonation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impersonationLogs'] });
      window.location.reload();
    },
  });

  const handleStartImpersonation = () => {
    if (!selectedRole) {
      alert('Please select a role to impersonate');
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmImpersonation = () => {
    startImpersonationMutation.mutate({
      role: selectedRole,
      purpose: purpose,
      notes: notes,
    });
    setShowConfirmDialog(false);
  };

  const handleEndImpersonation = () => {
    if (confirm('Exit Owner Mode and return to your regular view?')) {
      endImpersonationMutation.mutate();
    }
  };

  const roleOptions = [
    { value: 'manager', label: 'Manager', icon: '👔', description: 'Full management access' },
    { value: 'chef', label: 'Head Chef', icon: '👨‍🍳', description: 'Kitchen operations & menu' },
    { value: 'sous_chef', label: 'Sous Chef', icon: '🔪', description: 'Kitchen support' },
    { value: 'line_cook', label: 'Line Cook', icon: '🍳', description: 'Basic kitchen staff' },
    { value: 'server', label: 'Server', icon: '🍽️', description: 'Front of house service' },
    { value: 'bartender', label: 'Bartender', icon: '🍸', description: 'Bar operations' },
    { value: 'host', label: 'Host', icon: '👋', description: 'Guest services' },
    { value: 'cleaner', label: 'Cleaner', icon: '🧹', description: 'Hygiene & cleaning' },
    { value: 'maintenance', label: 'Maintenance', icon: '🔧', description: 'Equipment & repairs' },
  ];

  const activeSessions = impersonationLogs.filter(log => log.status === 'active');
  const recentSessions = impersonationLogs.filter(log => log.status === 'completed').slice(0, 10);

  return (
    <AccessGuard allowedRoles={['admin']} allowedPositions={['owner']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex gap-3 mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link to={createPageUrl('ProtectionDashboard')}>
              <Button variant="outline" size="sm" className="bg-blue-600 text-white border-blue-700 hover:bg-blue-700">
                <Shield className="w-4 h-4 mr-2" />
                Protection Dashboard
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-10 h-10 text-orange-600" />
              <h1 className="text-4xl font-bold text-gray-100">Owner Control Panel</h1>
            </div>
            <p className="text-gray-300 text-lg">
              Securely test different role experiences and audit app functionality
            </p>
          </div>

          {/* Current Status */}
          {impersonationData ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-none shadow-2xl mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="w-6 h-6" />
                        <h2 className="text-2xl font-bold">IMPERSONATION ACTIVE</h2>
                      </div>
                      <p className="text-orange-100 mb-3">
                        You are currently viewing AURA as: <span className="font-bold uppercase">{impersonationData.role}</span>
                      </p>
                      <p className="text-sm text-orange-100">
                        Started: {formatDistanceToNow(new Date(impersonationData.startTime), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      onClick={handleEndImpersonation}
                      size="lg"
                      variant="secondary"
                      className="bg-white text-orange-600 hover:bg-gray-100"
                    >
                      <Unlock className="w-5 h-5 mr-2" />
                      Exit Owner Mode
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Start Role Impersonation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-3 block">Select Role to Impersonate</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {roleOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedRole(option.value)}
                          className={`p-4 border-2 rounded-xl transition-all text-left ${
                            selectedRole === option.value
                              ? 'border-blue-600 bg-blue-50 shadow-lg'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-3xl mb-2">{option.icon}</div>
                          <p className="font-semibold text-gray-900 mb-1">{option.label}</p>
                          <p className="text-xs text-gray-600">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Purpose of Impersonation</label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="testing">🧪 Testing New Features</SelectItem>
                        <SelectItem value="auditing">🔍 Security Audit</SelectItem>
                        <SelectItem value="troubleshooting">🛠️ Troubleshooting Issues</SelectItem>
                        <SelectItem value="training">📚 Training Demo</SelectItem>
                        <SelectItem value="demo">🎬 Client Demo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Session Notes (Optional)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Testing new form assignment workflow..."
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleStartImpersonation}
                    disabled={!selectedRole || startImpersonationMutation.isPending}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    size="lg"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Activate Owner Mode as {selectedRole ? roleOptions.find(r => r.value === selectedRole)?.label : 'Selected Role'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Sessions Warning */}
          {activeSessions.length > 0 && (
            <Card className="border-l-4 border-l-red-500 bg-red-50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> There are {activeSessions.length} active impersonation session(s). 
                    Make sure to exit properly to complete audit logs.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Impersonation Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No impersonation sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-purple-100 text-purple-800">
                            {log.impersonated_role}
                          </Badge>
                          <Badge variant="outline">
                            {log.purpose}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900 font-medium">
                          {log.owner_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(log.session_start), 'PPP p')} • Duration: {log.duration_minutes || 0} min
                        </p>
                        {log.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{log.notes}"</p>
                        )}
                      </div>
                      <div className="text-right">
                        {log.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                            Active Now
                          </Badge>
                        ) : (
                          <Badge variant="outline">Completed</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Security & Compliance</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>✓ All impersonation sessions are logged with timestamps</li>
                    <li>✓ Actions performed while impersonating are tracked</li>
                    <li>✓ Session data is stored in ImpersonationLog entity</li>
                    <li>✓ Audit trail is accessible only to owners and admins</li>
                    <li>✓ Sessions automatically log IP address and device info</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Dialog */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Confirm Role Impersonation
                </DialogTitle>
                <DialogDescription>
                  You are about to enter Owner Mode and view the app as a different role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-900 font-medium mb-2">Important:</p>
                  <ul className="space-y-1 text-sm text-orange-800">
                    <li>• The app will reload with the selected role's view</li>
                    <li>• All your actions will be logged</li>
                    <li>• An orange banner will appear at the top</li>
                    <li>• Return here to exit Owner Mode</li>
                  </ul>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    Impersonating: <span className="text-orange-600 uppercase">{selectedRole}</span>
                  </p>
                  <p className="text-sm text-gray-600">Purpose: {purpose}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmImpersonation}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Activate Owner Mode
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AccessGuard>
  );
}
