
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
  Loader2, // Added for loading states
  Play, // Added for run button
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAgentManager } from '../components/aurabrain'; // New import

export default function AuraBrainDashboard() {
  const navigate = useNavigate(); // Initialized useNavigate
  const queryClient = useQueryClient();
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [selectedAgent, setSelectedAgent] = useState(null); // New state
  const [runningAgent, setRunningAgent] = useState(null); // New state

  const { 
    status: agentStatus, 
    runAll, 
    runAgent, 
    getHistory, 
    healthCheck 
  } = useAgentManager(); // Initialized useAgentManager

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner'; // New variable
  const isManager = user?.position === 'manager' || isAdmin; // Adjusted isManager

  const { data: logs = [], isLoading: loadingLogs } = useQuery({ // Renamed agentLogs to logs and isLoading to loadingLogs
    queryKey: ['agentLogs', filterAgent, filterStatus],
    queryFn: async () => {
      let fetchedLogs = await base44.entities.AgentLog.list('-created_date', 100);
      
      if (filterAgent !== 'all') {
        fetchedLogs = fetchedLogs.filter(l => l.agent_name === filterAgent);
      }
      
      if (filterStatus !== 'all') {
        fetchedLogs = fetchedLogs.filter(l => l.status === filterStatus);
      }
      
      return fetchedLogs;
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

  // NEW: Run specific agent
  const handleRunAgent = async (agentName) => {
    if (!isManager) {
      alert('⚠️ Only managers can run agents');
      return;
    }

    setRunningAgent(agentName);
    
    try {
      const result = await runAgent(agentName);
      
      if (result.status === 'success') {
        alert(`✅ ${agentName} Agent completed successfully!`);
        queryClient.invalidateQueries({ queryKey: ['agentLogs'] });
      } else if (result.status === 'error') {
        alert(`❌ ${agentName} Agent failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error running agent: ${error.message}`);
    } finally {
      setRunningAgent(null);
    }
  };

  // NEW: Run all agents
  const handleRunAll = async () => {
    if (!isManager) {
      alert('⚠️ Only managers can run agents');
      return;
    }

    setRunningAgent('all');
    
    try {
      const result = await runAll();
      
      if (result.status === 'success') {
        alert('✅ All agents completed successfully!');
        queryClient.invalidateQueries({ queryKey: ['agentLogs'] });
      } else {
        alert(`⚠️ Some agents had issues. Check the logs.`);
      }
    } catch (error) {
      alert(`❌ Error running agents: ${error.message}`);
    } finally {
      setRunningAgent(null);
    }
  };

  // The 'stats' calculation and the 'agentStats' array are no longer used in the new UI.
  // The old 'Overview Stats' and 'Agent Cards' sections have been replaced.

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">AURA Brain</h1>
              <p className="text-gray-600">Autonomous AI agents monitoring your operations 24/7</p>
            </div>
          </div>
        </div>

        {/* Agent Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Hygiene Agent */}
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Hygiene Agent</h3>
                    <Badge className={agentStatus.agents?.hygiene?.isRunning ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                      {agentStatus.agents?.hygiene?.isRunning ? '🔄 Running' : '✓ Ready'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <p>✓ Auto-assign hygiene checklists</p>
                <p>✓ Calculate compliance scores</p>
                <p>✓ Detect temperature issues</p>
                <p>✓ Create hygiene alerts</p>
              </div>

              {agentStatus.agents?.hygiene?.lastRun && (
                <p className="text-xs text-gray-500 mb-4">
                  Last run: {format(new Date(agentStatus.agents.hygiene.lastRun), 'MMM d, h:mm a')}
                </p>
              )}

              <Button
                onClick={() => handleRunAgent('hygiene')}
                disabled={runningAgent !== null}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                {runningAgent === 'hygiene' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Inventory Agent */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Inventory Agent</h3>
                    <Badge className={agentStatus.agents?.inventory?.isRunning ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                      {agentStatus.agents?.inventory?.isRunning ? '🔄 Running' : '✓ Ready'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <p>✓ Monitor stock levels</p>
                <p>✓ Auto-generate orders</p>
                <p>✓ Predict shortages</p>
                <p>✓ Supplier optimization</p>
              </div>

              {agentStatus.agents?.inventory?.lastRun && (
                <p className="text-xs text-gray-500 mb-4">
                  Last run: {format(new Date(agentStatus.agents.inventory.lastRun), 'MMM d, h:mm a')}
                </p>
              )}

              <Button
                onClick={() => handleRunAgent('inventory')}
                disabled={runningAgent !== null}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {runningAgent === 'inventory' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quality Agent */}
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Quality Agent</h3>
                    <Badge className={agentStatus.agents?.quality?.isRunning ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                      {agentStatus.agents?.quality?.isRunning ? '🔄 Running' : '✓ Ready'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <p>✓ Audit SOP completion</p>
                <p>✓ Track quality scores</p>
                <p>✓ Create corrective tasks</p>
                <p>✓ Generate quality reports</p>
              </div>

              {agentStatus.agents?.quality?.lastRun && (
                <p className="text-xs text-gray-500 mb-4">
                  Last run: {format(new Date(agentStatus.agents.quality.lastRun), 'MMM d, h:mm a')}
                </p>
              )}

              <Button
                onClick={() => handleRunAgent('quality')}
                disabled={runningAgent !== null}
                className="w-full bg-amber-600 hover:bg-amber-700"
                size="sm"
              >
                {runningAgent === 'quality' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Agent Control Panel</h3>
                <p className="text-sm text-gray-600">
                  Run all agents together or manage individually
                </p>
              </div>
              <Button
                onClick={handleRunAll}
                disabled={runningAgent !== null}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {runningAgent === 'all' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running All Agents...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Run All Agents
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* Agent Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Agent Activity Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading agent logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No agent activity yet</p>
                <p className="text-sm text-gray-500 mt-2">Click "Run All Agents" to start</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 20).map((log, index) => { // Render only top 20 logs as per outline
                  const AgentIcon = getAgentIcon(log.agent_name); // Keep this utility
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className={`border-2 hover:shadow-md transition-shadow ${
                        log.status === 'completed' || log.status === 'approved' ? 'border-l-green-500 bg-green-50' :
                        log.status === 'failed' ? 'border-l-red-500 bg-red-50' :
                        'border-l-blue-500 bg-blue-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="capitalize">
                                  {log.agent_name?.replace('_', ' ')}
                                </Badge>
                                <Badge className={
                                  log.status === 'completed' || log.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  log.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                  log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }>
                                  {log.status}
                                </Badge>
                                {log.confidence_score && (
                                  <Badge variant="outline">
                                    {Math.round(log.confidence_score * 100)}% confidence
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="font-medium text-gray-900 mb-1">{log.action_description}</p>
                              <p className="text-sm text-gray-600 mb-2">{log.decision_reasoning}</p>
                              
                              {log.decision_data && (
                                <div className="text-xs text-gray-500 bg-white/50 p-2 rounded mt-2">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(log.decision_data, null, 2)}
                                  </pre>
                                </div>
                              )}

                              <p className="text-xs text-gray-500 mt-2">
                                {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}
                                {log.processing_time_ms && ` • ${log.processing_time_ms}ms`}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2">
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

                              {log.related_entity_id && log.action_url && (
                                <Link to={log.action_url}>
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-4 h-4" />
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
