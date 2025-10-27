import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Play,
  Square,
  Home,
  ArrowLeft,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { agentManager } from '../components/modules/AIAgentCore';

export default function AgentMonitor() {
  const [agentStatus, setAgentStatus] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: insights = [], refetch: refetchInsights } = useQuery({
    queryKey: ['agentInsights'],
    queryFn: () => base44.entities.AgentInsight.list('-created_at', 50),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['agentLogs'],
    queryFn: () => base44.entities.AgentLog.list('-timestamp', 100),
    refetchInterval: 60000,
  });

  useEffect(() => {
    // Get agent status
    const agents = agentManager.getAllAgents();
    const status = {};
    agents.forEach(agent => {
      status[agent.agentName] = {
        isRunning: agent.isRunning,
        config: agent.config,
      };
    });
    setAgentStatus(status);
  }, []);

  const handleStartAgents = async () => {
    await agentManager.startAll();
    window.location.reload();
  };

  const handleStopAgents = async () => {
    await agentManager.stopAll();
    window.location.reload();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[priority] || colors.medium;
  };

  const newInsights = insights.filter(i => i.status === 'new');
  const actionableInsights = insights.filter(i => i.is_actionable && i.status !== 'resolved');

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Agent Monitor
                </h1>
                <p className="text-gray-600">Autonomous intelligence system</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('AIConsole')}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                AI Console
              </Button>
            </Link>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Agent Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {Object.entries(agentStatus).map(([name, status]) => (
            <Card key={name} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <h3 className="font-bold text-gray-900">{name}</h3>
                  </div>
                  {status.isRunning ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">Stopped</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Check Interval: {Math.floor(status.config?.checkInterval / 1000 / 60)} min
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Control Panel */}
        {isAdmin && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Agent Control Panel</h3>
                  <p className="text-sm text-gray-600">Start or stop all AI agents</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleStartAgents} className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4 mr-2" />
                    Start All
                  </Button>
                  <Button onClick={handleStopAgents} variant="outline">
                    <Square className="w-4 h-4 mr-2" />
                    Stop All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">Total</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{insights.length}</p>
              <p className="text-blue-100 text-sm">Total Insights</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">New</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{newInsights.length}</p>
              <p className="text-green-100 text-sm">New Insights</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">Action</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{actionableInsights.length}</p>
              <p className="text-orange-100 text-sm">Need Action</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8" />
                <Badge className="bg-white/20 text-white">24h</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{logs.filter(l => 
                new Date(l.timestamp) > new Date(Date.now() - 86400000)
              ).length}</p>
              <p className="text-purple-100 text-sm">Actions Today</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Insights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Recent Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No insights yet</p>
                <p className="text-sm text-gray-400 mt-2">AI agents will generate insights as they monitor the system</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.slice(0, 10).map(insight => (
                  <div key={insight.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`p-2 rounded-lg ${
                      insight.priority === 'critical' ? 'bg-red-100' :
                      insight.priority === 'high' ? 'bg-orange-100' :
                      insight.priority === 'medium' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{insight.insight_title}</h4>
                        <Badge className={getPriorityColor(insight.priority)}>
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{insight.insight_description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          {insight.agent_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(insight.created_at), 'PPp')}
                        </span>
                        {insight.is_actionable && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            Actionable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Agent Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No activity logs yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 20).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 border-l-4 border-purple-500 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <Bot className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.agent_name} - {log.action_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(log.timestamp), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      log.status === 'completed' ? 'bg-green-100 text-green-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}