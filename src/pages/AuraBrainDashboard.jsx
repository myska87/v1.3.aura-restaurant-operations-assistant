import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Brain,
  Activity,
  TrendingUp,
  Package,
  Star,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Home,
  Download,
  Eye,
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
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: agentLogs = [], isLoading } = useQuery({
    queryKey: ['agentLogs', filterAgent, filterStatus],
    queryFn: async () => {
      let logs = await base44.entities.AgentLog.list('-created_date', 100);
      
      if (filterAgent !== 'all') {
        logs = logs.filter(l => l.agent_name === filterAgent);
      }
      
      if (filterStatus !== 'all') {
        logs = logs.filter(l => l.status === filterStatus);
      }
      
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
    },
  });

  const approveActionMutation = useMutation({
    mutationFn: (logId) =>
      base44.entities.AgentLog.update(logId, {
        status: 'approved',
        approved_by: user?.email,
        approved_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentLogs'] });
      alert('✅ Action approved!');
    },
  });

  const dismissActionMutation = useMutation({
    mutationFn: ({ logId, reason }) =>
      base44.entities.AgentLog.update(logId, {
        status: 'dismissed',
        dismissed_by: user?.email,
        dismissed_at: new Date().toISOString(),
        dismissal_reason: reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentLogs'] });
      alert('Action dismissed');
    },
  });

  // Calculate stats
  const stats = {
    total: agentLogs.length,
    pending: agentLogs.filter(l => l.status === 'pending').length,
    completed: agentLogs.filter(l => l.status === 'completed' || l.status === 'approved').length,
    failed: agentLogs.filter(l => l.status === 'failed').length,
  };

  const agentStats = [
    {
      name: 'Hygiene Agent',
      agent_name: 'hygiene_agent',
      icon: Activity,
      color: 'from-blue-500 to-cyan-500',
      actions: agentLogs.filter(l => l.agent_name === 'hygiene_agent').length,
    },
    {
      name: 'Inventory Agent',
      agent_name: 'inventory_agent',
      icon: Package,
      color: 'from-purple-500 to-pink-500',
      actions: agentLogs.filter(l => l.agent_name === 'inventory_agent').length,
    },
    {
      name: 'Quality Agent',
      agent_name: 'quality_agent',
      icon: Star,
      color: 'from-amber-500 to-orange-500',
      actions: agentLogs.filter(l => l.agent_name === 'quality_agent').length,
    },
  ];

  const getAgentIcon = (agentName) => {
    switch (agentName) {
      case 'hygiene_agent': return Activity;
      case 'inventory_agent': return Package;
      case 'quality_agent': return Star;
      case 'operations_agent': return Zap;
      case 'compliance_agent': return Shield;
      default: return Brain;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

        {/* Agent Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {agentStats.map((agent, index) => {
            const Icon = agent.icon;
            const config = agentConfigs.find(c => c.agent_name === agent.agent_name);
            
            return (
              <motion.div
                key={agent.agent_name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-gradient-to-br ${agent.color} text-white border-none shadow-lg`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Icon className="w-12 h-12 opacity-90" />
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`toggle-${agent.agent_name}`} className="text-white text-sm">
                          {config?.is_enabled ? 'Active' : 'Disabled'}
                        </Label>
                        <Switch
                          id={`toggle-${agent.agent_name}`}
                          checked={config?.is_enabled || false}
                          onCheckedChange={(checked) => {
                            if (config) {
                              toggleAgentMutation.mutate({ agentId: config.id, enabled: checked });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{agent.name}</h3>
                    <p className="text-white/80 text-sm mb-4">
                      {agent.actions} actions taken
                    </p>
                    <div className="bg-white/20 rounded-lg p-3">
                      <p className="text-xs text-white/90">Last run: {config?.last_run_at ? format(new Date(config.last_run_at), 'MMM d, h:mm a') : 'Never'}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label>Agent:</Label>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Agents</option>
                  <option value="hygiene_agent">Hygiene Agent</option>
                  <option value="inventory_agent">Inventory Agent</option>
                  <option value="quality_agent">Quality Agent</option>
                  <option value="operations_agent">Operations Agent</option>
                  <option value="compliance_agent">Compliance Agent</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Review</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <Button variant="outline" className="ml-auto">
                <Download className="w-4 h-4 mr-2" />
                Export Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner message="Loading AI activity..." />
            ) : agentLogs.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No AI activity yet"
                description="AURA Brain agents will appear here once they start monitoring your operations"
              />
            ) : (
              <div className="space-y-3">
                {agentLogs.map((log, index) => {
                  const AgentIcon = getAgentIcon(log.agent_name);
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="border-2 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                <AgentIcon className="w-5 h-5 text-white" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{log.action_description}</h4>
                                  <Badge className={getSeverityColor(log.severity)}>
                                    {log.severity}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-2">{log.decision_reasoning}</p>
                                
                                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(log.created_date), 'MMM d, h:mm a')}
                                  </span>
                                  <span>•</span>
                                  <span className="capitalize">{log.agent_name.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span className="capitalize">{log.action_type.replace('_', ' ')}</span>
                                  {log.confidence_score && (
                                    <>
                                      <span>•</span>
                                      <span>Confidence: {Math.round(log.confidence_score * 100)}%</span>
                                    </>
                                  )}
                                </div>

                                {log.decision_data && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs">
                                    <p className="font-semibold text-gray-700 mb-1">Decision Data:</p>
                                    <pre className="text-gray-600 overflow-x-auto">
                                      {JSON.stringify(log.decision_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Badge className={
                                log.status === 'completed' || log.status === 'approved' ? 'bg-green-100 text-green-800' :
                                log.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {log.status}
                              </Badge>

                              {log.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => approveActionMutation.mutate(log.id)}
                                    className="bg-green-50 text-green-700 hover:bg-green-100"
                                  >
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => dismissActionMutation.mutate({ logId: log.id, reason: 'Not needed' })}
                                    className="bg-red-50 text-red-700 hover:bg-red-100"
                                  >
                                    <ThumbsDown className="w-3 h-3 mr-1" />
                                    Dismiss
                                  </Button>
                                </div>
                              )}

                              {log.created_task_id && (
                                <Button size="sm" variant="outline">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View Task
                                </Button>
                              )}
                              
                              {log.created_order_id && (
                                <Link to={createPageUrl('Ordering')}>
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-3 h-3 mr-1" />
                                    View Order
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}