
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress'; // Added Progress import
import {
  Brain,
  Activity,
  Package,
  Star,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Home,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function AuraBrainDashboard() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState(null); // New state variable
  const [dismissingAction, setDismissingAction] = useState(null); // New state variable

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: agentLogs = [], isLoading } = useQuery({
    queryKey: ['agentLogs'], // Removed filterAgent, filterStatus from queryKey
    queryFn: async () => {
      // Fetch all logs, filtering will be done client-side based on selectedAgent
      let logs = await base44.entities.AgentLog.list('-created_date', 100);
      return logs;
    },
  });

  const { data: agentConfigs = [] } = useQuery({
    queryKey: ['agentConfigs'],
    queryFn: () => base44.entities.AgentConfig.list(),
  });

  const toggleAgentMutation = useMutation({
    mutationFn: ({ agentId, enabled }) =>
      base44.entities.AgentConfig.update(agentId, {
        is_enabled: enabled,
        updated_by: user?.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['agentLogs'] }); // Invalidate logs as agent activity might change
    },
  });

  // Consolidated mutation for updating agent log status
  const updateAgentLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgentLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentLogs'] });
      queryClient.invalidateQueries({ queryKey: ['agentConfigs'] }); // Agent configs might be affected if metrics are derived
    },
  });

  const handleApproveAction = async (log) => {
    await updateAgentLogMutation.mutateAsync({
      id: log.id,
      data: {
        status: 'approved',
        approved_by: user?.email,
        approved_at: new Date().toISOString(),
      }
    });
    alert('✅ Agent action approved!');
  };

  const handleDismissAction = async (log, reason) => {
    setDismissingAction(log.id);
    await updateAgentLogMutation.mutateAsync({
      id: log.id,
      data: {
        status: 'dismissed',
        dismissed_by: user?.email,
        dismissed_at: new Date().toISOString(),
        dismissal_reason: reason || 'Not needed',
      }
    });
    setDismissingAction(null);
    alert('✅ Agent action dismissed');
  };

  // Calculate global stats (for overview cards)
  const stats = {
    total: agentLogs.length,
    pending: agentLogs.filter(l => l.status === 'pending').length,
    completed: agentLogs.filter(l => l.status === 'completed' || l.status === 'approved').length,
    failed: agentLogs.filter(l => l.status === 'failed').length,
  };

  // Agent icons mapping
  const agentIcons = {
    'hygiene_agent': Activity,
    'inventory_agent': Package,
    'quality_agent': Star,
    'operations_agent': Zap,
    'compliance_agent': Shield,
    // Add other agents if needed
  };

  // Calculate agent-specific metrics
  const agentMetrics = useMemo(() => {
    const metrics = {};
    agentConfigs.forEach(config => {
      metrics[config.agent_name] = { total: 0, pending: 0, success: 0 };
    });

    agentLogs.forEach(log => {
      if (metrics[log.agent_name]) {
        metrics[log.agent_name].total++;
        if (log.status === 'pending') {
          metrics[log.agent_name].pending++;
        }
        if (log.status === 'completed' || log.status === 'approved') {
          metrics[log.agent_name].success++;
        }
      }
    });
    return metrics;
  }, [agentLogs, agentConfigs]);


  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">AURA Brain is only accessible to Managers and Administrators.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('AuraIntelligence')}>
            <Button variant="outline" size="sm">
              <Brain className="w-4 h-4 mr-2" />
              AURA Intelligence
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">AURA Brain</h1>
              <p className="text-gray-600">Intelligent agents monitoring your operations 24/7</p>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Actions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Status Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {agentConfigs.map((config) => {
            const metrics = agentMetrics[config.agent_name] || { total: 0, pending: 0, success: 0 };
            const Icon = agentIcons[config.agent_name] || Brain;

            return (
              <Card
                key={config.agent_name}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedAgent === config.agent_name ? 'border-2 border-emerald-500' : ''
                }`}
                onClick={() => setSelectedAgent(config.agent_name === selectedAgent ? null : config.agent_name)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${
                        config.is_enabled ? 'bg-emerald-100' : 'bg-gray-100'
                      } flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${
                          config.is_enabled ? 'text-emerald-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {config.agent_name.replace(/_/g, ' ').replace(/\bagent\b/i, '').trim()}
                        </h3>
                        <Badge className={
                          config.is_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }>
                          {config.is_enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      id={`toggle-${config.agent_name}`}
                      checked={config.is_enabled || false}
                      onCheckedChange={(checked) => {
                        toggleAgentMutation.mutate({ agentId: config.id, enabled: checked });
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent card click when toggling switch
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mt-4">
                    <div>
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-lg font-bold">{metrics.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Pending</p>
                      <p className="text-lg font-bold text-amber-600">{metrics.pending}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Success</p>
                      <p className="text-lg font-bold text-green-600">
                        {metrics.total > 0 ? Math.round((metrics.success / metrics.total) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Agent Actions */}
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent AI Actions</span>
              {selectedAgent && (
                <Badge variant="outline">
                  Filtered: {selectedAgent.replace(/_/g, ' ')}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-2 -mr-1"
                    onClick={() => setSelectedAgent(null)}
                  >
                    X
                  </Button>
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner message="Loading AI activity..." />
            ) : (
              <div className="space-y-3">
                {(selectedAgent
                  ? agentLogs.filter(log => log.agent_name === selectedAgent)
                  : agentLogs
                ).slice(0, 10).map((log, index) => {
                  const Icon = agentIcons[log.agent_name] || Brain;

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div
                        className={`p-4 rounded-lg border-2 ${
                          log.status === 'approved' ? 'border-green-200 bg-green-50' :
                          log.status === 'dismissed' ? 'border-gray-200 bg-gray-50' :
                          log.severity === 'critical' ? 'border-red-200 bg-red-50' :
                          'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <Icon className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{log.action_description}</h4>
                                <Badge className={
                                  log.severity === 'critical' ? 'bg-red-500 text-white' :
                                  log.severity === 'high' ? 'bg-orange-500 text-white' :
                                  log.severity === 'medium' ? 'bg-yellow-500 text-white' :
                                  'bg-blue-500 text-white'
                                }>
                                  {log.severity || 'info'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{log.decision_reasoning}</p>

                              {log.confidence_score !== undefined && (
                                <div className="mb-2">
                                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>AI Confidence</span>
                                    <span>{Math.round(log.confidence_score * 100)}%</span>
                                  </div>
                                  <Progress value={log.confidence_score * 100} className="h-1" />
                                </div>
                              )}

                              {log.related_entity_name && (
                                <p className="text-xs text-gray-500">
                                  Related: {log.related_entity_name}
                                </p>
                              )}

                              <p className="text-xs text-gray-400 mt-2">
                                {format(new Date(log.created_date), 'MMM d, yyyy • h:mm a')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className={
                              log.status === 'approved' ? 'bg-green-100 text-green-800' :
                              log.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                              log.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }>
                              {log.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Action Buttons for Pending Actions */}
                        {log.status === 'pending' && (user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin') && (
                          <div className="flex gap-2 pt-3 border-t border-gray-200">
                            <Button
                              size="sm"
                              onClick={() => handleApproveAction(log)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = prompt('Reason for dismissing this action?');
                                if (reason !== null && reason.trim() !== '') {
                                  handleDismissAction(log, reason);
                                } else if (reason !== null) {
                                  handleDismissAction(log, 'No reason provided');
                                }
                              }}
                              className="flex-1"
                              disabled={dismissingAction === log.id}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}

                        {/* Dismissal Reason Display */}
                        {log.status === 'dismissed' && log.dismissal_reason && (
                          <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-700">
                            <strong>Dismissed:</strong> {log.dismissal_reason}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {(selectedAgent
                  ? agentLogs.filter(log => log.agent_name === selectedAgent)
                  : agentLogs
                ).slice(0, 10).length === 0 && (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No agent activity yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      AURA Brain learns from your operations
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
