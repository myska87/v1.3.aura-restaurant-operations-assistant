import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Home,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DataBridgeMonitor() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['bridgeEvents'],
    queryFn: () => base44.entities.BridgeEventLog.list('-created_date', 100),
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30s
  });

  const { data: moduleStatus = [] } = useQuery({
    queryKey: ['bridgeModuleStatus'],
    queryFn: () => base44.entities.BridgeStatusMonitor.list(),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['bridgeMappings'],
    queryFn: () => base44.entities.BridgeMapping.list(),
  });

  // Access control
  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.created_date?.startsWith(today));
  
  const successfulEvents = todayEvents.filter(e => e.status === 'completed').length;
  const failedEvents = todayEvents.filter(e => e.status === 'failed').length;
  const pendingEvents = todayEvents.filter(e => e.status === 'pending' || e.status === 'processing').length;
  
  const avgLatency = events
    .filter(e => e.processing_duration_ms)
    .reduce((sum, e) => sum + e.processing_duration_ms, 0) / 
    (events.filter(e => e.processing_duration_ms).length || 1);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retrying':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModuleStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">DataBridge Monitor is only accessible to system administrators.</p>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="mt-4">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-[#014D40]" />
              DataBridge Monitor
            </h1>
            <p className="text-gray-600 mt-2">Real-time module integration & event processing</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                refetch();
                alert('Data refreshed!');
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Events Today</p>
                  <h3 className="text-3xl font-bold text-gray-900">{todayEvents.length}</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Successful</p>
                  <h3 className="text-3xl font-bold text-green-600">{successfulEvents}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {todayEvents.length > 0 ? Math.round((successfulEvents / todayEvents.length) * 100) : 0}% success rate
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Failed</p>
                  <h3 className="text-3xl font-bold text-red-600">{failedEvents}</h3>
                  <p className="text-xs text-gray-500 mt-1">{pendingEvents} pending</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Avg Latency</p>
                  <h3 className="text-3xl font-bold text-gray-900">{Math.round(avgLatency)}ms</h3>
                  <p className="text-xs text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    Fast processing
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Status */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#014D40]" />
              Module Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {['tasks', 'workforce', 'compliance', 'leafe', 'inventory', 'menu', 'documents', 'checklists', 'forms', 'payroll'].map(moduleName => {
                const moduleData = moduleStatus.find(m => m.module_name === moduleName);
                const status = moduleData?.status || 'offline';
                
                return (
                  <div key={moduleName} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${getModuleStatusColor(status)}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">{moduleName}</p>
                      <p className="text-xs text-gray-500 capitalize">{status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Active Mappings */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Active Data Mappings ({mappings.filter(m => m.is_active).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mappings.filter(m => m.is_active).map(mapping => (
                <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{mapping.mapping_name}</p>
                    <p className="text-sm text-gray-600">
                      {mapping.source_module}.{mapping.source_entity} → {mapping.target_module}.{mapping.target_entity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{mapping.sync_frequency}</Badge>
                    <Badge variant="outline">{mapping.sync_direction}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Events</span>
              <Badge variant="outline">{events.length} events</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No events recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 50).map(event => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                        <Badge variant="outline">{event.source_module}</Badge>
                        <span className="text-sm font-medium text-gray-900">{event.event_type}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.created_date), 'MMM d, HH:mm:ss')}
                        </span>
                        {event.processing_duration_ms && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {event.processing_duration_ms}ms
                          </span>
                        )}
                        {event.triggered_by_name && (
                          <span>by {event.triggered_by_name}</span>
                        )}
                      </div>
                      {event.error_message && (
                        <p className="text-xs text-red-600 mt-1">Error: {event.error_message}</p>
                      )}
                    </div>
                    {event.retry_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Retry {event.retry_count}
                      </Badge>
                    )}
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